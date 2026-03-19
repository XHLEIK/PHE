import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import { generatePheTrackingId } from '@/lib/models/Counter';
import { createAuditEntry } from '@/lib/models/AuditLog';
import { verifyAccessToken } from '@/lib/auth';
import { createComplaintSchema, enhancedComplaintQuerySchema } from '@/lib/validations';
import {
  successResponse,
  errorResponse,
  getClientIp,
  getAccessTokenFromCookies,
} from '@/lib/api-utils';
import { getComplaintRateLimiter, invalidateCacheByPrefix } from '@/lib/redis';
import { processAnalysis } from '@/lib/gemini';
import { v4 as uuidv4 } from 'uuid';
import { toAdminCtx, authorize, buildScopeQuery, AuthorizationError } from '@/lib/rbac';
import { ARUNACHAL_DISTRICTS, PHE_DEPARTMENT_IDS } from '@/lib/constants/phe';
import { ensureComplaintChatBootstrap } from '@/lib/chat-bootstrap';

/**
 * POST /api/complaints — Submit a new complaint (public, rate-limited)
 * Saves immediately, responds 201, then fires AI analysis asynchronously.
 */

const MAX_JSON_SIZE = 100 * 1024; // 100 KB

export async function POST(req: NextRequest) {
  const correlationId = uuidv4();
  const ip = getClientIp(req);

  // Reject oversized payloads early
  const contentLength = Number(req.headers.get('content-length') || '0');
  if (contentLength > MAX_JSON_SIZE) {
    return errorResponse('Request body too large. Maximum 100 KB.', 413);
  }

  // Redis-backed rate limit: per-IP, 10 complaints per 15 minutes
  try {
    const limiter = getComplaintRateLimiter();
    const { success, remaining } = await limiter.limit(`complaint:${ip}`);
    if (!success) {
      return errorResponse('Too many complaints submitted. Please try again later.', 429);
    }
  } catch (rlErr: any) {
    // If Redis is down, allow the request through (fail-open) but log
    console.warn('[COMPLAINT] Redis rate limit unavailable, allowing request:', rlErr.message || rlErr);
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

    // PHE-only tracking ID format: AP-PHE-YYYY-NNNNNN
    const state = 'Arunachal Pradesh';
    const district = ARUNACHAL_DISTRICTS.includes(parsed.data.district as (typeof ARUNACHAL_DISTRICTS)[number])
      ? parsed.data.district
      : 'Papum Pare';
    const complaintId = await generatePheTrackingId();

    const complaint = await Complaint.create({
      complaintId,
      title: parsed.data.title,
      description: parsed.data.description,
      category: 'pending_ai', // AI will assign this
      priority: 'medium',      // AI may override this
      location: parsed.data.location || '',
      state,
      district,
      submitterName: parsed.data.submitterName,
      submitterPhone: parsed.data.submitterPhone,
      submitterEmail: parsed.data.submitterEmail,
      coordinates: parsed.data.coordinates || null,
      analysisStatus: 'queued',
      analysisAttempts: 0,
      department: 'complaint_cell',
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
      // Invalidate dashboard stats/analytics cache
      invalidateCacheByPrefix('stats:').catch(() => {});
      invalidateCacheByPrefix('analytics:').catch(() => {});

      // Auto-create chat with initial citizen grievance text + first AI reply
      (async () => {
        try {
          const email = parsed.data.submitterEmail?.toLowerCase();
          if (email) {
            await ensureComplaintChatBootstrap(
              {
                complaintId: complaint.complaintId,
                title: complaint.title,
                description: complaint.description,
                location: complaint.location,
                department: complaint.department,
                status: complaint.status,
              },
              email
            );
          }
        } catch (chatErr) {
          console.error('[COMPLAINT POST] Chat session auto-create error:', chatErr);
        }
      })();
    });

    return response;
  } catch (err) {
    console.error('[COMPLAINT CREATE ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * GET /api/complaints — List complaints (admin only, paginated, filterable)
 * RBAC: scoped to admin's jurisdiction (location + department)
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

    const adminCtx = toAdminCtx(payload);

    try {
      authorize(adminCtx, 'complaint:view');
    } catch (e) {
      if (e instanceof AuthorizationError) return errorResponse(e.message, 403);
      throw e;
    }

    const { searchParams } = new URL(req.url);
    const queryObj: Record<string, string> = {};
    searchParams.forEach((value, key) => { queryObj[key] = value; });

    const parsed = enhancedComplaintQuerySchema.safeParse(queryObj);
    if (!parsed.success) {
      return errorResponse('Invalid query parameters', 400,
        parsed.error.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const { page, limit, status, priority, sort, search, department, assignedTo, slaBreached, dateFrom, dateTo, cursor } = parsed.data;

    await connectDB();

    // Build filter — enforce RBAC scope (location + department)
    const scopeFilter = buildScopeQuery(adminCtx);
    const filter: Record<string, unknown> = {
      ...scopeFilter,
      department: { $in: PHE_DEPARTMENT_IDS },
    };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (department) filter.department = department;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (slaBreached !== undefined) filter.slaBreached = slaBreached === 'true';
    if (search) {
      filter.$text = { $search: search };
    }

    // Date range filtering on createdAt
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      filter.createdAt = dateFilter;
    }

    // Build sort
    const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    const sortObj: Record<string, 1 | -1> = { [sortField]: sortOrder };

    // Cursor-based pagination: use _id as tie-breaker
    if (cursor) {
      filter._id = sortOrder === -1 ? { $lt: cursor } : { $gt: cursor };
    }

    const useCursor = !!cursor;
    const skip = useCursor ? 0 : (page - 1) * limit;

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .select('-submitterPhone -submitterEmail') // always mask in list
        .lean(),
      Complaint.countDocuments(useCursor ? {} : filter), // skip count on cursor mode for perf
    ]);

    const lastItem = complaints[complaints.length - 1];
    const nextCursor = lastItem ? String((lastItem as unknown as { _id: unknown })._id) : null;

    return successResponse(complaints, {
      page: useCursor ? undefined : page,
      limit,
      total: useCursor ? undefined : total,
      totalPages: useCursor ? undefined : Math.ceil(total / limit),
      nextCursor,
    });
  } catch (err) {
    console.error('[COMPLAINT LIST ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
