import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Department from '@/lib/models/Department';
import User from '@/lib/models/User';
import { createAuditEntry } from '@/lib/models/AuditLog';
import { verifyAccessToken } from '@/lib/auth';
import { departmentAdminSchema } from '@/lib/validations';
import {
  successResponse,
  errorResponse,
  getAccessTokenFromCookies,
  getClientIp,
} from '@/lib/api-utils';
import { v4 as uuidv4 } from 'uuid';
import { toAdminCtx, authorize, AuthorizationError, ADMIN_ROLES } from '@/lib/rbac';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/departments/[id]/admins — List admins assigned to a department
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);

    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid or expired token', 401);

    const { id } = await context.params;

    await connectDB();

    const dept = await Department.findOne({ id }).lean();
    if (!dept) return errorResponse('Department not found', 404);

    // Find all admins assigned to this department
    const admins = await User.find({
      $or: [
        { departments: id },
        { role: 'head_admin' },
      ],
      isActive: true,
    })
      .select('name email role departments isActive')
      .sort({ role: 1, name: 1 })
      .lean();

    return successResponse({
      department: { id: dept.id, label: dept.label },
      admins,
      total: admins.length,
    });
  } catch (err) {
    console.error('[DEPT ADMINS LIST ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * POST /api/admin/departments/[id]/admins — Assign an admin to a department (RBAC-controlled)
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const correlationId = uuidv4();
  const ip = getClientIp(req);

  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);

    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid or expired token', 401);

    const adminCtx = toAdminCtx(payload);

    try {
      authorize(adminCtx, 'user:update');
    } catch (e) {
      if (e instanceof AuthorizationError) return errorResponse(e.message, 403);
      throw e;
    }

    const { id } = await context.params;
    const body = await req.json();
    const parsed = departmentAdminSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Validation failed', 400,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parsed.error.issues.map((e: any) => ({
          field: String(e.path.join('.')),
          message: e.message,
        }))
      );
    }

    await connectDB();

    const dept = await Department.findOne({ id }).lean();
    if (!dept) return errorResponse('Department not found', 404);

    const admin = await User.findOne({ email: parsed.data.adminEmail });
    if (!admin) return errorResponse('Admin user not found', 404);

    if (!admin.isActive) {
      return errorResponse('Cannot assign inactive admin', 400);
    }

    if (admin.role === 'head_admin') {
      return errorResponse('Head admins already have access to all departments', 400);
    }

    // Check if already assigned
    if (admin.departments?.includes(id)) {
      return errorResponse('Admin is already assigned to this department', 409);
    }

    // Add department to admin
    admin.departments = [...(admin.departments || []), id];
    await admin.save();

    await createAuditEntry({
      action: 'department.admin_assigned',
      actor: payload.email,
      targetType: 'department',
      targetId: id,
      changes: {
        departments: {
          from: admin.departments.filter((d: string) => d !== id),
          to: admin.departments,
        },
      },
      metadata: {
        adminEmail: parsed.data.adminEmail,
        departmentLabel: dept.label,
      },
      correlationId,
      ipAddress: ip,
    });

    return successResponse({
      message: `${admin.name || admin.email} assigned to ${dept.label}`,
      admin: {
        email: admin.email,
        name: admin.name,
        departments: admin.departments,
      },
    });
  } catch (err) {
    console.error('[DEPT ADMIN ASSIGN ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * DELETE /api/admin/departments/[id]/admins — Remove an admin from a department (RBAC-controlled)
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const correlationId = uuidv4();
  const ip = getClientIp(req);

  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);

    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid or expired token', 401);

    const adminCtx = toAdminCtx(payload);

    try {
      authorize(adminCtx, 'user:update');
    } catch (e) {
      if (e instanceof AuthorizationError) return errorResponse(e.message, 403);
      throw e;
    }

    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const adminEmail = searchParams.get('adminEmail');

    if (!adminEmail) {
      return errorResponse('adminEmail query parameter is required', 400);
    }

    await connectDB();

    const dept = await Department.findOne({ id }).lean();
    if (!dept) return errorResponse('Department not found', 404);

    const admin = await User.findOne({ email: adminEmail });
    if (!admin) return errorResponse('Admin user not found', 404);

    if (!admin.departments?.includes(id)) {
      return errorResponse('Admin is not assigned to this department', 400);
    }

    const previousDepts = [...admin.departments];
    admin.departments = admin.departments.filter((d: string) => d !== id);
    await admin.save();

    await createAuditEntry({
      action: 'department.admin_removed',
      actor: payload.email,
      targetType: 'department',
      targetId: id,
      changes: {
        departments: { from: previousDepts, to: admin.departments },
      },
      metadata: {
        adminEmail,
        departmentLabel: dept.label,
      },
      correlationId,
      ipAddress: ip,
    });

    return successResponse({
      message: `${admin.name || admin.email} removed from ${dept.label}`,
      admin: {
        email: admin.email,
        name: admin.name,
        departments: admin.departments,
      },
    });
  } catch (err) {
    console.error('[DEPT ADMIN REMOVE ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
