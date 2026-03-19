import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Department from '@/lib/models/Department';
import { verifyAccessToken } from '@/lib/auth';
import { successResponse, errorResponse, getAccessTokenFromCookies } from '@/lib/api-utils';
import { toAdminCtx, getRoleLevel } from '@/lib/rbac';
import { PHE_DEPARTMENT_IDS } from '@/lib/constants/phe';

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
    const filter = getRoleLevel(adminCtx.role) > 1
      ? { id: { $in: PHE_DEPARTMENT_IDS }, active: true }
      : { id: { $in: PHE_DEPARTMENT_IDS } };
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
export async function POST() {
  return errorResponse(
    'Department catalog is fixed for PHE & Water Supply deployment. Creating new departments is disabled.',
    405
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
