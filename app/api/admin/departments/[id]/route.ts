import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Department, { auditDepartmentChange } from '@/lib/models/Department';
import { verifyAccessToken } from '@/lib/auth';
import { successResponse, errorResponse, getAccessTokenFromCookies, getClientIp } from '@/lib/api-utils';
import { authorize, toAdminCtx } from '@/lib/rbac';

/**
 * PATCH /api/admin/departments/[id] — Update department metadata
 * Requires department:update permission.
 * Soft-delete: set active=false instead of hard deletion.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);
    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid or expired token', 401);

    const adminCtx = toAdminCtx(payload);
    authorize(adminCtx, 'department:update');

    const { id } = await params;
    const body = await req.json();
    const { label, description, subcategories, sla_days, escalation_level, active } = body;

    await connectDB();

    const dept = await Department.findOne({ id });
    if (!dept) return errorResponse('Department not found', 404);

    // Track changes for audit log
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    if (label !== undefined && label !== dept.label) {
      changes.label = { from: dept.label, to: label };
      dept.label = label.trim();
    }
    if (description !== undefined && description !== dept.description) {
      changes.description = { from: dept.description, to: description };
      dept.description = description.trim();
    }
    if (subcategories !== undefined) {
      changes.subcategories = { from: dept.subcategories, to: subcategories };
      dept.subcategories = subcategories;
    }
    if (sla_days !== undefined && sla_days !== dept.sla_days) {
      changes.sla_days = { from: dept.sla_days, to: sla_days };
      dept.sla_days = sla_days;
    }
    if (escalation_level !== undefined && escalation_level !== dept.escalation_level) {
      changes.escalation_level = { from: dept.escalation_level, to: escalation_level };
      dept.escalation_level = escalation_level;
    }
    if (active !== undefined && active !== dept.active) {
      changes.active = { from: dept.active, to: active };
      dept.active = active;
    }

    if (Object.keys(changes).length === 0) {
      return errorResponse('No changes detected', 400);
    }

    await dept.save();
    await auditDepartmentChange(dept.id, payload.email, changes, getClientIp(req));

    return successResponse({ department: dept });
  } catch (err) {
    console.error('[DEPARTMENT PATCH ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * DELETE /api/admin/departments/[id] — Not allowed (soft-delete only)
 */
export async function DELETE() {
  return errorResponse(
    'Hard deletion of departments is not permitted. Set active=false to deactivate.',
    405
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
