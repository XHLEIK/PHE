import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import Department from '@/lib/models/Department';
import { createAuditEntry } from '@/lib/models/AuditLog';
import { verifyAccessToken } from '@/lib/auth';
import { updateComplaintSchema, TERMINAL_STATUSES } from '@/lib/validations';
import {
  successResponse,
  errorResponse,
  getAccessTokenFromCookies,
  getClientIp,
} from '@/lib/api-utils';
import { v4 as uuidv4 } from 'uuid';
import { notifyCitizenOnStatusChange } from '@/lib/citizen-notification-service';
import { invalidateCacheByPrefix } from '@/lib/redis';
import { toAdminCtx, authorize, AuthorizationError, getRoleLevel } from '@/lib/rbac';

// Mask sensitive contact fields — head_admin & cabinet see unmasked
function maskContact(complaint: Record<string, unknown>, canSeeContact: boolean) {
  if (canSeeContact) return complaint;
  const masked = { ...complaint };
  if (masked.submitterPhone) {
    const p = String(masked.submitterPhone);
    masked.submitterPhone = '*****' + p.slice(-4);
  }
  if (masked.submitterEmail) {
    const e = String(masked.submitterEmail);
    const [local, domain] = e.split('@');
    masked.submitterEmail = local.slice(0, 2) + '***@' + domain;
  }
  return masked;
}

/**
 * GET /api/complaints/[id] — Get a single complaint by complaintId (RBAC-controlled)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: rawId } = await params;
    const id = decodeURIComponent(rawId);
    await connectDB();

    const complaint = await Complaint.findOne({ complaintId: id }).lean();
    if (!complaint) {
      return errorResponse('Complaint not found', 404);
    }

    // Scope authorization — check permission + scope against this complaint
    try {
      authorize(adminCtx, 'complaint:view', {
        state: (complaint as any).state,
        district: (complaint as any).district,
        block: (complaint as any).block,
        area: (complaint as any).area,
        department: (complaint as any).department,
      });
    } catch (e) {
      if (e instanceof AuthorizationError) return errorResponse('You do not have access to this complaint', 403);
      throw e;
    }

    // head_admin & cabinet can see unmasked contact info
    const canSeeContact = getRoleLevel(adminCtx.role) <= 1;
    return successResponse(maskContact(complaint as unknown as Record<string, unknown>, canSeeContact));
  } catch (err) {
    console.error('[COMPLAINT GET ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * PATCH /api/complaints/[id] — Update complaint (admin only)
 * Reason is MANDATORY for terminal transitions: resolved, closed, escalated
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const correlationId = uuidv4();
  const ip = getClientIp(req);

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

    const body = await req.json();
    const parsed = updateComplaintSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Validation failed', 400,
        parsed.error.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const { id: rawId } = await params;
    const id = decodeURIComponent(rawId);
    await connectDB();

    const complaint = await Complaint.findOne({ complaintId: id });
    if (!complaint) {
      return errorResponse('Complaint not found', 404);
    }

    // Scope authorization for update
    try {
      authorize(adminCtx, 'complaint:update', {
        state: complaint.state,
        district: complaint.district,
        department: complaint.department,
      });
    } catch (e) {
      if (e instanceof AuthorizationError) return errorResponse('You do not have access to this complaint', 403);
      throw e;
    }

    // Role-based status restrictions — lower-rank roles cannot resolve/close
    const newStatus = parsed.data.status;
    if (newStatus) {
      const roleLevel = getRoleLevel(adminCtx.role);
      // Roles at level 8+ (junior_officer, field_staff, support_staff) cannot resolve/close
      if (roleLevel >= 8) {
        const forbiddenStatuses = ['resolved', 'closed'];
        if (forbiddenStatuses.includes(newStatus)) {
          return errorResponse('Your role cannot resolve or close complaints. Please escalate or contact a senior officer.', 403);
        }
      }
    }

    // Enforce mandatory reason for terminal/escalation transitions
    if (newStatus && (TERMINAL_STATUSES as readonly string[]).includes(newStatus)) {
      if (!parsed.data.reason) {
        return errorResponse(
          `A reason is required when changing status to "${newStatus}". Please select a reason.`,
          400
        );
      }
    }

    // Track changes for audit
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    const update = parsed.data;

    if (update.status !== undefined && update.status !== complaint.status) {
      changes.status = { from: complaint.status, to: update.status };
      complaint.status = update.status;
    }
    if (update.priority !== undefined && update.priority !== complaint.priority) {
      changes.priority = { from: complaint.priority, to: update.priority };
      complaint.priority = update.priority;
    }
    if (update.department !== undefined && update.department !== complaint.department) {
      changes.department = { from: complaint.department, to: update.department };
      complaint.department = update.department;

      // Recompute SLA deadline based on new department's sla_days
      try {
        const dept = await Department.findOne({ name: update.department, isActive: true }).lean();
        if (dept && dept.sla_days) {
          const now = new Date();
          const newDeadline = new Date(now.getTime() + dept.sla_days * 24 * 60 * 60 * 1000);
          changes.slaDeadline = { from: complaint.slaDeadline, to: newDeadline };
          complaint.slaDeadline = newDeadline;
          complaint.slaBreached = false;
        }
      } catch (slaErr) {
        console.error('[SLA COMPUTE ERROR]', slaErr);
      }
    }
    if (update.assignedTo !== undefined && update.assignedTo !== complaint.assignedTo) {
      changes.assignedTo = { from: complaint.assignedTo, to: update.assignedTo };
      complaint.assignedTo = update.assignedTo ?? null;
    }

    // Clear SLA when moving to terminal statuses
    if (update.status && ['resolved', 'closed', 'withdrawn'].includes(update.status)) {
      if (complaint.slaDeadline) {
        changes.slaDeadline = { from: complaint.slaDeadline, to: null };
        complaint.slaDeadline = null;
      }
    }

    if (Object.keys(changes).length === 0) {
      return errorResponse('No changes detected', 400);
    }

    await complaint.save();

    // Audit log — always includes reason + comment if provided
    await createAuditEntry({
      action: 'complaint.updated',
      actor: payload.email,
      targetType: 'complaint',
      targetId: complaint._id.toString(),
      changes,
      metadata: {
        complaintId: complaint.complaintId,
        reason: update.reason || null,
        comment: update.comment || null,
      },
      correlationId,
      ipAddress: ip,
    });

    // Fire citizen notification asynchronously (don't await — best effort)
    if (Object.keys(changes).length > 0) {
      notifyCitizenOnStatusChange(
        complaint._id.toString(),
        complaint.complaintId,
        changes,
        { actor: payload.email, correlationId }
      ).catch(err => console.error('[CITIZEN NOTIFICATION ERROR]', err));

      // Invalidate dashboard stats/analytics cache on status/priority changes
      invalidateCacheByPrefix('stats:').catch(() => { });
      invalidateCacheByPrefix('analytics:').catch(() => { });
    }

    const canSeeContact = getRoleLevel(adminCtx.role) <= 1;
    return successResponse(maskContact(complaint.toJSON() as unknown as Record<string, unknown>, canSeeContact));
  } catch (err) {
    console.error('[COMPLAINT UPDATE ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
