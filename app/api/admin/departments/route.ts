import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Department, { auditDepartmentChange } from '@/lib/models/Department';
import { verifyAccessToken } from '@/lib/auth';
import { successResponse, errorResponse, getAccessTokenFromCookies, getClientIp } from '@/lib/api-utils';
import { toAdminCtx, authorize, AuthorizationError, getRoleLevel } from '@/lib/rbac';

/**
 * GET /api/admin/departments — List all departments
 * - head_admin/cabinet: all departments (including inactive)
 * - others: active departments only
 */
export async function GET(req: NextRequest) {
  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);
    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid or expired token', 401);

    const adminCtx = toAdminCtx(payload);

    await connectDB();

    // Top-level roles (level ≤ 1) see all including inactive
    const filter = getRoleLevel(adminCtx.role) > 1 ? { active: true } : {};
    const departments = await Department.find(filter).sort({ label: 1 }).lean();

    return successResponse(departments);
  } catch (err) {
    console.error('[DEPARTMENTS GET ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * POST /api/admin/departments — Create a new department (head_admin/cabinet only)
 */
export async function POST(req: NextRequest) {
  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);
    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid or expired token', 401);

    const adminCtx = toAdminCtx(payload);

    try {
      authorize(adminCtx, 'department:create');
    } catch (e) {
      if (e instanceof AuthorizationError) return errorResponse(e.message, 403);
      throw e;
    }

    const body = await req.json();
    const { id, label, description, subcategories, sla_days, escalation_level } = body;

    if (!id || !label) {
      return errorResponse('Department id and label are required', 400);
    }

    await connectDB();

    const existing = await Department.findOne({ id });
    if (existing) {
      return errorResponse('A department with this ID already exists', 409);
    }

    const dept = await Department.create({
      id: id.trim().toLowerCase(),
      label: label.trim(),
      description: description?.trim() || '',
      subcategories: Array.isArray(subcategories) ? subcategories : [],
      sla_days: sla_days || 21,
      escalation_level: escalation_level || 1,
      active: true,
    });

    await auditDepartmentChange(dept.id, payload.email, {
      created: { from: null, to: dept.label },
    }, getClientIp(req));

    return successResponse({ department: dept }, undefined, 201);
  } catch (err) {
    console.error('[DEPARTMENTS POST ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
