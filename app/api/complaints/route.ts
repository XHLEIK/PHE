import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import { createAuditEntry } from '@/lib/models/AuditLog';
import { verifyAccessToken } from '@/lib/auth';
import { createComplaintSchema, complaintQuerySchema } from '@/lib/validations';
import {
  successResponse,
  errorResponse,
  getClientIp,
  getAccessTokenFromCookies,
  generateComplaintId,
  checkRateLimit,
} from '@/lib/api-utils';
import { processAnalysis } from '@/lib/gemini';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/complaints — Submit a new complaint (public, rate-limited)
 * Saves immediately, responds 201, then fires AI analysis asynchronously.
 */
export async function POST(req: NextRequest) {
  const correlationId = uuidv4();
  const ip = getClientIp(req);

  // Rate limit: per-IP, 10 complaints per 15 minutes
  const rl = checkRateLimit(`complaint:${ip}`, 10, 900_000);
  if (!rl.allowed) {
    return errorResponse('Too many complaints submitted. Please try again later.', 429);
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

    const complaintId = generateComplaintId();

    const complaint = await Complaint.create({
      complaintId,
      title: parsed.data.title,
      description: parsed.data.description,
      category: 'pending_ai', // AI will assign this
      priority: 'medium',      // AI may override this
      location: parsed.data.location || '',
      submitterName: parsed.data.submitterName,
      submitterPhone: parsed.data.submitterPhone,
      submitterEmail: parsed.data.submitterEmail,
      coordinates: parsed.data.coordinates || null,
      analysisStatus: 'queued',
      analysisAttempts: 0,
      department: 'Unassigned',
    });

    // Audit log
    await createAuditEntry({
      action: 'complaint.created',
      actor: 'citizen',
      targetType: 'complaint',
      targetId: complaint._id.toString(),
      metadata: {
        complaintId: complaint.complaintId,
        ip,
        hasCoordinates: !!parsed.data.coordinates,
      },
      correlationId,
      ipAddress: ip,
    });

    // Respond immediately — do NOT await AI analysis
    const response = successResponse(
      {
        complaintId: complaint.complaintId,
        message: 'Complaint submitted successfully. Your reference ID is ' + complaint.complaintId,
        status: complaint.status,
      },
      undefined,
      201
    );

    // Fire-and-forget AI analysis — structured so a queue worker can replace this call
    // without any other code changes (processAnalysis is a standalone function)
    setImmediate(() => {
      processAnalysis(complaint.complaintId).catch(err => {
        console.error('[COMPLAINT POST] Fire-and-forget analysis error:', err);
      });
    });

    return response;
  } catch (err) {
    console.error('[COMPLAINT CREATE ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * GET /api/complaints — List complaints (admin only, paginated, filterable)
 * department_admin: scoped to their departments only
 */
export async function GET(req: NextRequest) {
  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) {
      return errorResponse('Authentication required', 401);
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return errorResponse('Invalid or expired token', 401);
    }

    const { searchParams } = new URL(req.url);
    const queryObj: Record<string, string> = {};
    searchParams.forEach((value, key) => { queryObj[key] = value; });

    const parsed = complaintQuerySchema.safeParse(queryObj);
    if (!parsed.success) {
      return errorResponse('Invalid query parameters', 400,
        parsed.error.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const { page, limit, status, priority, sort, search, department } = parsed.data;

    await connectDB();

    // Build filter — enforce department scoping for department_admin and staff
    const filter: Record<string, unknown> = {};
    if ((payload.role === 'department_admin' || payload.role === 'staff') && payload.departments?.length) {
      filter.department = { $in: payload.departments };
    }
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (department) filter.department = department;
    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort
    const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    const sortObj: Record<string, 1 | -1> = { [sortField]: sortOrder };

    const skip = (page - 1) * limit;

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .select('-submitterPhone -submitterEmail') // always mask in list
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
    console.error('[COMPLAINT LIST ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
