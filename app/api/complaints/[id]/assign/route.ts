import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import User from '@/lib/models/User';
import { createAuditEntry } from '@/lib/models/AuditLog';
import { verifyAccessToken } from '@/lib/auth';
import { assignComplaintSchema } from '@/lib/validations';
import { notifyAssignment } from '@/lib/notifications';
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
 * POST /api/complaints/[id]/assign — Assign a complaint to an admin user
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const correlationId = uuidv4();
  const ip = getClientIp(req);

  // Redis-backed mutation rate limit
  const rlError = await applyMutationRateLimit(req, 'assign');
  if (rlError) return rlError;

  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);

    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid or expired token', 401);

    const adminCtx = toAdminCtx(payload);

    try {
      authorize(adminCtx, 'complaint:assign');
    } catch (e) {
      if (e instanceof AuthorizationError) return errorResponse(e.message, 403);
      throw e;
    }

    const { id: rawId } = await context.params;
    const id = decodeURIComponent(rawId);
    const body = await req.json();
    const parsed = assignComplaintSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Validation failed', 400, formatZodErrors(parsed.error.issues));
    }

    await connectDB();

    const complaint = await Complaint.findById(id);
    if (!complaint) return errorResponse('Complaint not found', 404);

    // RBAC scope check
    try {
      authorize(adminCtx, 'complaint:assign', {
        state: complaint.state,
        district: complaint.district,
        department: complaint.department,
      });
    } catch (e) {
      if (e instanceof AuthorizationError) return errorResponse('Access denied to this complaint', 403);
      throw e;
    }

    // Determine the assignee email
    let assigneeEmail: string;
    if (parsed.data.assignToSelf) {
      assigneeEmail = payload.email;
    } else {
      assigneeEmail = parsed.data.assignToEmail!;
    }

    // Verify assignee exists, is active, and has department access
    const assignee = await User.findOne({ email: assigneeEmail, isActive: true }).lean();
    if (!assignee) {
      return errorResponse('Assignee not found or inactive', 404);
    }

    // For non-head_admin assignees, verify department access
    if (assignee.role !== 'head_admin') {
      if (!assignee.departments?.includes(complaint.department)) {
        return errorResponse('Assignee does not have access to this department', 400);
      }
    }

    // Track changes for audit
    const previousAssignedTo = complaint.assignedTo?.toString() || null;
    const previousAssignedToName = complaint.assignedToName || null;

    // Assign
    complaint.assignedTo = String(assignee._id);
    complaint.assignedToName = assignee.name || assignee.email;

    // If complaint is in pending or triage, move to in_progress
    if (['pending', 'triage'].includes(complaint.status)) {
      complaint.status = 'in_progress';
    }

    await complaint.save();

    // Send notification to assignee
    try {
      await notifyAssignment(
        assigneeEmail,
        payload.email,
        complaint._id.toString(),
        complaint.complaintId,
        complaint.title
      );
    } catch (notifyErr) {
      console.error('[ASSIGN NOTIFY ERROR]', notifyErr);
      // Non-blocking — assignment still succeeds
    }

    // Audit log
    await createAuditEntry({
      action: 'complaint.assigned',
      actor: payload.email,
      targetType: 'complaint',
      targetId: id,
      changes: {
        assignedTo: { from: previousAssignedTo, to: assignee._id.toString() },
        assignedToName: { from: previousAssignedToName, to: assignee.name || assignee.email },
      },
      metadata: {
        assigneeEmail,
        trackingId: complaint.complaintId,
      },
      correlationId,
      ipAddress: ip,
    });

    return successResponse({
      message: 'Complaint assigned successfully',
      complaint: {
        _id: complaint._id,
        complaintId: complaint.complaintId,
        status: complaint.status,
        assignedTo: complaint.assignedTo,
        assignedToName: complaint.assignedToName,
      },
    });
  } catch (err) {
    console.error('[ASSIGN ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
