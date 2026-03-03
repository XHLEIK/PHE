import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import { createAuditEntry } from '@/lib/models/AuditLog';
import { verifyAccessToken } from '@/lib/auth';
import { updateComplaintSchema } from '@/lib/validations';
import {
  successResponse,
  errorResponse,
  getAccessTokenFromCookies,
  getClientIp,
} from '@/lib/api-utils';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/complaints/[id] — Get a single complaint by complaintId (admin only)
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

    return successResponse(complaint);
  } catch (err) {
    console.error('[COMPLAINT GET ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * PATCH /api/complaints/[id] — Update complaint status/priority/assignment (admin only)
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
      complaint.assignedTo = update.assignedTo;
    }

    if (Object.keys(changes).length === 0) {
      return errorResponse('No changes detected', 400);
    }

    await complaint.save();

    // Audit log for state change
    await createAuditEntry({
      action: 'complaint.updated',
      actor: payload.email,
      targetType: 'complaint',
      targetId: complaint._id.toString(),
      changes,
      metadata: { complaintId: complaint.complaintId },
      correlationId,
      ipAddress: ip,
    });

    return successResponse(complaint.toJSON());
  } catch (err) {
    console.error('[COMPLAINT UPDATE ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
