import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import { generateTrackingId } from '@/lib/models/Counter';
import { createAuditEntry } from '@/lib/models/AuditLog';
import {
  verifyAccessToken,
  getCitizenAccessTokenFromCookies,
} from '@/lib/auth';
import { createComplaintSchema, citizenComplaintQuerySchema } from '@/lib/validations';
import { successResponse, errorResponse, getClientIp } from '@/lib/api-utils';
import { getComplaintRateLimiter } from '@/lib/redis';
import { processAnalysis } from '@/lib/gemini';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import Citizen from '@/lib/models/Citizen';
import ChatSession from '@/lib/models/ChatSession';
import ChatMessage from '@/lib/models/ChatMessage';

/**
 * GET /api/citizen/complaints — List authenticated citizen's own complaints
 */
export async function GET(req: NextRequest) {
  try {
    const token = getCitizenAccessTokenFromCookies(req);
    if (!token) {
      return errorResponse('Authentication required', 401);
    }

    const payload = verifyAccessToken(token);
    if (!payload || payload.role !== 'citizen') {
      return errorResponse('Invalid or expired token', 401);
    }

    const { searchParams } = new URL(req.url);
    const queryObj: Record<string, string> = {};
    searchParams.forEach((value, key) => { queryObj[key] = value; });

    const parsed = citizenComplaintQuerySchema.safeParse(queryObj);
    if (!parsed.success) {
      return errorResponse('Invalid query parameters', 400,
        parsed.error.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const { page, limit, status, sort, search } = parsed.data;

    await connectDB();

    // Return complaints owned by this citizen (by ID) OR submitted with their email
    const ownershipFilter = {
      $or: [
        { citizenId: payload.userId },
        { submitterEmail: payload.email },
      ],
    };
    const filter: Record<string, unknown> = { ...ownershipFilter };
    if (status) filter.status = status;
    if (search) filter.$text = { $search: search };

    const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    const sortObj: Record<string, 1 | -1> = { [sortField]: sortOrder };

    const skip = (page - 1) * limit;

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .select('complaintId title status priority department category createdAt updatedAt location state district aiSummary')
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    return successResponse(complaints, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[CITIZEN COMPLAINTS LIST ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * POST /api/citizen/complaints — Submit a new complaint as authenticated citizen
 * Auto-fills submitter info from citizen profile, links citizenId.
 */
export async function POST(req: NextRequest) {
  const correlationId = uuidv4();
  const ip = getClientIp(req);

  const token = getCitizenAccessTokenFromCookies(req);
  if (!token) {
    return errorResponse('Authentication required', 401);
  }

  const payload = verifyAccessToken(token);
  if (!payload || payload.role !== 'citizen') {
    return errorResponse('Invalid or expired token', 401);
  }

  // Rate limit
  try {
    const limiter = getComplaintRateLimiter();
    const { success } = await limiter.limit(`complaint:${ip}`);
    if (!success) {
      return errorResponse('Too many complaints submitted. Please try again later.', 429);
    }
  } catch (rlErr) {
    console.warn('[CITIZEN COMPLAINT] Redis rate limit unavailable:', rlErr);
  }

  try {
    const body = await req.json();
    const parsed = createComplaintSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Validation failed', 400,
        parsed.error.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    await connectDB();

    // Get citizen profile for auto-fill
    const citizen = await Citizen.findById(payload.userId);
    if (!citizen) {
      return errorResponse('Citizen account not found', 404);
    }

    // Use state/district from complaint form, fallback to citizen profile
    const state = parsed.data.state || citizen.state || 'Arunachal Pradesh';
    const district = parsed.data.district || citizen.district || 'General';
    const complaintId = await generateTrackingId(state, district);

    const complaint = await Complaint.create({
      complaintId,
      citizenId: citizen._id,
      title: parsed.data.title,
      description: parsed.data.description,
      category: 'pending_ai',
      priority: 'medium',
      location: parsed.data.location || '',
      state,
      district,
      // Auto-fill from citizen profile
      submitterName: parsed.data.submitterName || citizen.name,
      submitterPhone: parsed.data.submitterPhone || citizen.phone,
      submitterEmail: parsed.data.submitterEmail || citizen.email,
      coordinates: parsed.data.coordinates || null,
      analysisStatus: 'queued',
      analysisAttempts: 0,
      department: 'Unassigned',
      callConsent: parsed.data.callConsent ?? false,
      attachments: (parsed.data.attachments || []).map((a) => ({
        fileName: a.fileName,
        fileType: a.fileType,
        fileSize: a.fileSize,
        storageKey: a.publicId,
        url: a.url,
        thumbnailUrl: a.thumbnailUrl || '',
        streamingUrl: a.streamingUrl || '',
        posterUrl: a.posterUrl || '',
      })),
    });

    // Audit log
    await createAuditEntry({
      action: 'complaint.created',
      actor: citizen.email,
      targetType: 'complaint',
      targetId: complaint._id.toString(),
      metadata: {
        complaintId: complaint.complaintId,
        citizenId: citizen._id.toString(),
        ip,
      },
      correlationId,
      ipAddress: ip,
    });

    // Auto-create a ChatSession so the citizen can chat with AI immediately
    try {
      const existingSession = await ChatSession.findOne({ complaintId: complaint.complaintId });
      if (!existingSession) {
        const accessToken = crypto.randomBytes(32).toString('hex');
        await ChatSession.create({
          complaintId: complaint.complaintId,
          email: citizen.email.toLowerCase(),
          title: complaint.title,
          accessToken,
        });

        // Create the first user message (summarising the complaint)
        await ChatMessage.create({
          complaintId: complaint.complaintId,
          senderType: 'user',
          content: `I have filed a grievance:\n\n**Title:** ${complaint.title}\n\n**Description:** ${complaint.description}\n\n**Location:** ${complaint.location || 'Not specified'}\n\nPlease help me with this issue.`,
        });
      }
    } catch (chatErr) {
      // Non-blocking: chat creation failure should not fail the complaint submission
      console.error('[CITIZEN COMPLAINT] Chat session auto-create error:', chatErr);
    }

    const response = successResponse(
      {
        complaintId: complaint.complaintId,
        message: 'Complaint submitted successfully. Your reference ID is ' + complaint.complaintId,
        status: complaint.status,
      },
      undefined,
      201
    );

    // Fire-and-forget: AI analysis
    setImmediate(() => {
      processAnalysis(complaint.complaintId).catch(err => {
        console.error('[CITIZEN COMPLAINT] Fire-and-forget analysis error:', err);
      });
    });

    return response;
  } catch (err) {
    console.error('[CITIZEN COMPLAINT CREATE ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
