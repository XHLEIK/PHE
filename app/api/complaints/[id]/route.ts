import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
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

// Mask sensitive contact fields for non-head_admin
function maskContact(complaint: Record<string, unknown>, isHeadAdmin: boolean) {
  if (isHeadAdmin) return complaint;
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
 * GET /api/complaints/[id] — Get a single complaint by complaintId (admin only)
 * department_admin: 403 if complaint is outside their departments
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

    const { id } = await params;
    await connectDB();

    const complaint = await Complaint.findOne({ complaintId: id }).lean();
    if (!complaint) {
      return errorResponse('Complaint not found', 404);
    }

    // Department scoping for department_admin and staff
    if ((payload.role === 'department_admin' || payload.role === 'staff') && payload.departments?.length) {
      if (!payload.departments.includes(String((complaint as any).department))) {
        return errorResponse('You do not have access to this complaint', 403);
      }
    }

    const isHeadAdmin = payload.role === 'head_admin';
    return successResponse(maskContact(complaint as unknown as Record<string, unknown>, isHeadAdmin));
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

    const body = await req.json();
    const parsed = updateComplaintSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Validation failed', 400,
        parsed.error.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const { id } = await params;
    await connectDB();

    const complaint = await Complaint.findOne({ complaintId: id });
    if (!complaint) {
      return errorResponse('Complaint not found', 404);
    }

    // Department scoping for department_admin and staff
    if ((payload.role === 'department_admin' || payload.role === 'staff') && payload.departments?.length) {
      if (!payload.departments.includes(complaint.department)) {
        return errorResponse('You do not have access to this complaint', 403);
      }
    }

    // Staff role restrictions: cannot close or resolve complaints
    const newStatus = parsed.data.status;
    if (payload.role === 'staff' && newStatus) {
      const staffForbiddenStatuses = ['resolved', 'closed'];
      if (staffForbiddenStatuses.includes(newStatus)) {
        return errorResponse('Staff members cannot resolve or close complaints. Please escalate or contact a department admin.', 403);
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
    }
    if (update.assignedTo !== undefined && update.assignedTo !== complaint.assignedTo) {
      changes.assignedTo = { from: complaint.assignedTo, to: update.assignedTo };
      complaint.assignedTo = update.assignedTo ?? null;
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

    const isHeadAdmin = payload.role === 'head_admin';
    return successResponse(maskContact(complaint.toJSON() as unknown as Record<string, unknown>, isHeadAdmin));
  } catch (err) {
    console.error('[COMPLAINT UPDATE ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
