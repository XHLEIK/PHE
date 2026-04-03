import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import InternalNote from '@/lib/models/InternalNote';
import { createAuditEntry } from '@/lib/models/AuditLog';
import { verifyAccessToken } from '@/lib/auth';
import { createNoteSchema } from '@/lib/validations';
import {
  successResponse,
  errorResponse,
  formatZodErrors,
  getAccessTokenFromCookies,
  getClientIp,
  applyMutationRateLimit,
} from '@/lib/api-utils';
import { v4 as uuidv4 } from 'uuid';
import { toAdminCtx, authorize, AuthorizationError } from '@/lib/rbac';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/complaints/[id]/notes — List internal notes for a complaint
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);

    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid or expired token', 401);

    const { id: rawId } = await context.params;
    const id = decodeURIComponent(rawId);

    await connectDB();

    // Verify complaint exists and admin has access
    const complaint = await Complaint.findById(id).select('department state district').lean();
    if (!complaint) return errorResponse('Complaint not found', 404);

    const adminCtx = toAdminCtx(payload);
    try {
      authorize(adminCtx, 'complaint:view', {
        state: (complaint as any).state,
        district: (complaint as any).district,
        department: complaint.department,
      });
    } catch (e) {
      if (e instanceof AuthorizationError) return errorResponse('Access denied', 403);
      throw e;
    }

    const notes = await InternalNote.find({ complaintId: id })
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(notes);
  } catch (err) {
    console.error('[NOTES LIST ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * POST /api/complaints/[id]/notes — Add an internal note
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const correlationId = uuidv4();
  const ip = getClientIp(req);

  // Redis-backed mutation rate limit
  const rlError = await applyMutationRateLimit(req, 'notes');
  if (rlError) return rlError;

  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);

    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid or expired token', 401);

    const { id: rawId } = await context.params;
    const id = decodeURIComponent(rawId);
    const body = await req.json();
    const parsed = createNoteSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Validation failed', 400, formatZodErrors(parsed.error.issues));
    }

    await connectDB();

    const complaint = await Complaint.findById(id);
    if (!complaint) return errorResponse('Complaint not found', 404);

    const adminCtx = toAdminCtx(payload);
    try {
      authorize(adminCtx, 'complaint:update', {
        state: complaint.state,
        district: complaint.district,
        department: complaint.department,
      });
    } catch (e) {
      if (e instanceof AuthorizationError) return errorResponse('Access denied', 403);
      throw e;
    }

    const note = await InternalNote.create({
      complaintId: id,
      authorId: payload.userId || null,
      authorEmail: payload.email,
      authorName: payload.email,
      content: parsed.data.content,
      type: 'manual',
    });

    // Increment note count on complaint
    complaint.internalNoteCount = (complaint.internalNoteCount || 0) + 1;
    await complaint.save();

    // Audit log
    await createAuditEntry({
      action: 'complaint.note_added',
      actor: payload.email,
      targetType: 'complaint',
      targetId: id,
      changes: {},
      metadata: { noteId: note._id.toString(), contentLength: parsed.data.content.length },
      correlationId,
      ipAddress: ip,
    });

    return successResponse(note, undefined, 201);
  } catch (err) {
    console.error('[NOTE CREATE ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
