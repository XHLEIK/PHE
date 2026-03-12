import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import { createAuditEntry } from '@/lib/models/AuditLog';
import { verifyAccessToken } from '@/lib/auth';
import { bulkUpdateSchema } from '@/lib/validations';
import {
  successResponse,
  errorResponse,
  formatZodErrors,
  getAccessTokenFromCookies,
  getClientIp,
} from '@/lib/api-utils';
import { v4 as uuidv4 } from 'uuid';
import { toAdminCtx, authorize, buildScopeQuery, AuthorizationError } from '@/lib/rbac';

/**
 * PATCH /api/complaints/bulk — Bulk update up to 50 complaints
 */
export async function PATCH(req: NextRequest) {
  const correlationId = uuidv4();
  const ip = getClientIp(req);

  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);

    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid or expired token', 401);

    const adminCtx = toAdminCtx(payload);

    try {
      authorize(adminCtx, 'complaint:bulk-update');
    } catch (e) {
      if (e instanceof AuthorizationError) return errorResponse(e.message, 403);
      throw e;
    }

    const body = await req.json();
    const parsed = bulkUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Validation failed', 400, formatZodErrors(parsed.error.issues));
    }

    const { complaintIds, updates, reason } = parsed.data;

    await connectDB();

    // Fetch all complaints
    const complaints = await Complaint.find({
      _id: { $in: complaintIds },
    });

    if (complaints.length === 0) {
      return errorResponse('No complaints found', 404);
    }

    // RBAC scope check: verify all complaints are within admin's jurisdiction
    const scopeFilter = buildScopeQuery(adminCtx);
    const scopedComplaints = await Complaint.find({
      _id: { $in: complaintIds },
      ...scopeFilter,
    });
    if (scopedComplaints.length !== complaints.length) {
      return errorResponse(
        `Access denied to ${complaints.length - scopedComplaints.length} complaint(s) outside your jurisdiction`,
        403
      );
    }

    // Build update object
    const updateFields: Record<string, unknown> = {};
    if (updates.status) updateFields.status = updates.status;
    if (updates.priority) updateFields.priority = updates.priority;
    if (updates.department) updateFields.department = updates.department;
    if (updates.assignedTo) updateFields.assignedTo = updates.assignedTo;

    if (Object.keys(updateFields).length === 0) {
      return errorResponse('No valid update fields provided', 400);
    }

    // Apply updates
    const result = await Complaint.updateMany(
      { _id: { $in: complaintIds } },
      { $set: updateFields }
    );

    // Create audit entry for each complaint
    const auditPromises = complaints.map((complaint) =>
      createAuditEntry({
        action: 'complaint.bulk_updated',
        actor: payload.email,
        targetType: 'complaint',
        targetId: complaint._id.toString(),
        changes: Object.fromEntries(
          Object.entries(updateFields).map(([key, value]) => [
            key,
            {
              from: (complaint.toObject() as unknown as Record<string, unknown>)[key],
              to: value,
            },
          ])
        ),
        metadata: {
          reason,
          bulkOperationId: correlationId,
          trackingId: complaint.complaintId,
          totalInBatch: complaintIds.length,
        },
        correlationId,
        ipAddress: ip,
      })
    );

    await Promise.all(auditPromises);

    return successResponse({
      message: `${result.modifiedCount} complaint(s) updated successfully`,
      total: complaintIds.length,
      found: complaints.length,
      modified: result.modifiedCount,
      updates: updateFields,
      reason,
    });
  } catch (err) {
    console.error('[BULK UPDATE ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
