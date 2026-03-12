import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Department from '@/lib/models/Department';
import Complaint from '@/lib/models/Complaint';
import User from '@/lib/models/User';
import { verifyAccessToken } from '@/lib/auth';
import { successResponse, errorResponse, getAccessTokenFromCookies } from '@/lib/api-utils';
import { authorize, toAdminCtx, getRoleLevel } from '@/lib/rbac';

/**
 * GET /api/admin/departments/stats
 * Returns department list enriched with live grievance counts and assigned admin counts.
 * Requires department:view permission.
 */
export async function GET(req: NextRequest) {
  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);
    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid or expired token', 401);

    const adminCtx = toAdminCtx(payload);
    authorize(adminCtx, 'department:view');

    await connectDB();

    // Fetch all departments
    const departments = await Department.find({}).sort({ label: 1 }).lean();

    // Aggregate grievance counts by department
    const grievanceAgg = await Complaint.aggregate([
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'triage', 'in_progress']] }, 1, 0] },
          },
        },
      },
    ]);

    const grievanceMap: Record<string, { total: number; resolved: number; pending: number }> = {};
    grievanceAgg.forEach((g) => {
      grievanceMap[g._id] = { total: g.total, resolved: g.resolved, pending: g.pending };
    });

    // Aggregate admin counts by department (all roles with departments assigned)
    const adminAgg = await User.aggregate([
      { $match: { departments: { $exists: true, $ne: [] } } },
      { $unwind: '$departments' },
      {
        $group: {
          _id: '$departments',
          count: { $sum: 1 },
        },
      },
    ]);

    // Count admins at level ≤ 1 (head_admin, cabinet) — they have access to all departments
    const globalAdminCount = await User.countDocuments({ role: { $in: ['head_admin', 'cabinet'] } });

    const adminMap: Record<string, number> = {};
    adminAgg.forEach((a) => {
      adminMap[a._id] = a.count;
    });

    // Build response
    const result = departments.map((dept) => {
      const stats = grievanceMap[dept.id] || { total: 0, resolved: 0, pending: 0 };
      const deptAdmins = adminMap[dept.id] || 0;
      return {
        id: dept.id,
        label: dept.label,
        description: dept.description,
        sla_days: dept.sla_days,
        escalation_level: dept.escalation_level,
        active: dept.active,
        totalGrievances: stats.total,
        resolvedGrievances: stats.resolved,
        pendingGrievances: stats.pending,
        assignedAdmins: deptAdmins + globalAdminCount, // global admins have access to all
      };
    });

    return successResponse(result);
  } catch (err) {
    console.error('[DEPARTMENT STATS ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
