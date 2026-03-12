import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import Department from '@/lib/models/Department';
import { createAuditEntry } from '@/lib/models/AuditLog';
import { verifyAccessToken } from '@/lib/auth';
import { escalateComplaintSchema } from '@/lib/validations';
import { notifyEscalation } from '@/lib/notifications';
import {
  successResponse,
  errorResponse,
  formatZodErrors,
  getAccessTokenFromCookies,
  getClientIp,
  applyMutationRateLimit,
} from '@/lib/api-utils';
import { v4 as uuidv4 } from 'uuid';
import { authorize, toAdminCtx, AuthorizationError } from '@/lib/rbac';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/complaints/[id]/escalate — Escalate a complaint to another department
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const correlationId = uuidv4();
  const ip = getClientIp(req);

  // Redis-backed mutation rate limit
  const rlError = await applyMutationRateLimit(req, 'escalate');
  if (rlError) return rlError;

  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);

    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid or expired token', 401);

    const adminCtx = toAdminCtx(payload);
    authorize(adminCtx, 'complaint:reassign');

    const { id } = await context.params;
    const body = await req.json();
    const parsed = escalateComplaintSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Validation failed', 400, formatZodErrors(parsed.error.issues));
    }

    await connectDB();

    const complaint = await Complaint.findById(id);
    if (!complaint) return errorResponse('Complaint not found', 404);

    // RBAC scope check
    try {
      authorize(adminCtx, 'complaint:reassign', {
        state: complaint.state,
        district: complaint.district,
        department: complaint.department,
      });
    } catch (e) {
      if (e instanceof AuthorizationError) return errorResponse('Access denied to this complaint', 403);
      throw e;
    }

    // Cannot escalate to the same department
    if (complaint.department === parsed.data.toDepartment) {
      return errorResponse('Cannot escalate to the same department', 400);
    }

    // Verify target department exists
    const targetDept = await Department.findOne({
      name: parsed.data.toDepartment,
      isActive: true,
    }).lean();
    if (!targetDept) {
      return errorResponse('Target department not found or inactive', 404);
    }

    const fromDepartment = complaint.department;

    // Push escalation entry
    complaint.escalationHistory.push({
      fromDepartment,
      toDepartment: parsed.data.toDepartment,
      reason: parsed.data.reason,
      escalatedBy: payload.email,
      escalatedAt: new Date(),
    });

    // Update complaint department and status
    complaint.department = parsed.data.toDepartment;
    complaint.status = 'escalated';

    // Clear current assignee (new department should assign)
    complaint.assignedTo = null;
    complaint.assignedToName = null;

    // Recompute SLA deadline based on new department
    if (targetDept.sla_days) {
      const now = new Date();
      complaint.slaDeadline = new Date(
        now.getTime() + targetDept.sla_days * 24 * 60 * 60 * 1000
      );
      complaint.slaBreached = false;
    }

    await complaint.save();

    // Send notification to new department admins
    try {
      await notifyEscalation(
        parsed.data.toDepartment,
        payload.email,
        complaint._id.toString(),
        complaint.complaintId,
        parsed.data.reason
      );
    } catch (notifyErr) {
      console.error('[ESCALATE NOTIFY ERROR]', notifyErr);
    }

    // Audit log
    await createAuditEntry({
      action: 'complaint.escalated',
      actor: payload.email,
      targetType: 'complaint',
      targetId: id,
      changes: {
        department: { from: fromDepartment, to: parsed.data.toDepartment },
        status: { from: 'in_progress', to: 'escalated' },
      },
      metadata: {
        reason: parsed.data.reason,
        trackingId: complaint.complaintId,
        escalationCount: complaint.escalationHistory.length,
      },
      correlationId,
      ipAddress: ip,
    });

    return successResponse({
      message: 'Complaint escalated successfully',
      complaint: {
        _id: complaint._id,
        complaintId: complaint.complaintId,
        status: complaint.status,
        department: complaint.department,
        escalationHistory: complaint.escalationHistory,
        slaDeadline: complaint.slaDeadline,
      },
    });
  } catch (err) {
    console.error('[ESCALATE ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
