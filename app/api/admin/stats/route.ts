import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import Department from '@/lib/models/Department';
import { verifyAccessToken } from '@/lib/auth';
import { successResponse, errorResponse, getAccessTokenFromCookies } from '@/lib/api-utils';
import { cached } from '@/lib/redis';
import { toAdminCtx, authorize, buildScopeQuery, AuthorizationError } from '@/lib/rbac';

/**
 * GET /api/admin/stats — Aggregated dashboard statistics (RBAC-scoped)
 */
export async function GET(req: NextRequest) {
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

    try {
      authorize(adminCtx, 'complaint:view');
    } catch (e) {
      if (e instanceof AuthorizationError) return errorResponse(e.message, 403);
      throw e;
    }

    await connectDB();

    // Build base filter from RBAC scope
    const baseFilter = buildScopeQuery(adminCtx);

    // Cache key scoped to role/scope
    const deptKey = adminCtx.departments.sort().join(',') || 'all';
    const locKey = `${adminCtx.locationScope.state || 'any'}:${adminCtx.locationScope.district || 'any'}`;
    const cacheKey = `stats:${payload.role}:${locKey}:${deptKey}`;

    const statsData = await cached(cacheKey, 300, async () => {
      const [
        totalComplaints, pendingCount, triageCount, inProgressCount,
        resolvedCount, closedCount, escalatedCount, deferredCount,
        criticalCount, highCount, mediumCount, lowCount,
      ] = await Promise.all([
        Complaint.countDocuments(baseFilter),
        Complaint.countDocuments({ ...baseFilter, status: 'pending' }),
        Complaint.countDocuments({ ...baseFilter, status: 'triage' }),
        Complaint.countDocuments({ ...baseFilter, status: 'in_progress' }),
        Complaint.countDocuments({ ...baseFilter, status: 'resolved' }),
        Complaint.countDocuments({ ...baseFilter, status: 'closed' }),
        Complaint.countDocuments({ ...baseFilter, status: 'escalated' }),
        Complaint.countDocuments({ ...baseFilter, analysisStatus: 'deferred' }),
        Complaint.countDocuments({ ...baseFilter, priority: 'critical' }),
        Complaint.countDocuments({ ...baseFilter, priority: 'high' }),
        Complaint.countDocuments({ ...baseFilter, priority: 'medium' }),
        Complaint.countDocuments({ ...baseFilter, priority: 'low' }),
      ]);

      const deptAgg = await Complaint.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: '$department',
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] } },
            deferred: { $sum: { $cond: [{ $eq: ['$analysisStatus', 'deferred'] }, 1, 0] } },
          },
        },
        { $sort: { total: -1 } },
      ]);

      const allDepts = await Department.find({ active: true }).lean();
      const deptLabelMap: Record<string, string> = {};
      allDepts.forEach(d => { deptLabelMap[d.id] = d.label; });

      const departmentStats = deptAgg.map(d => ({
        id: d._id || 'unassigned',
        label: deptLabelMap[d._id] || d._id || 'Unassigned',
        total: d.total,
        pending: d.pending,
        resolved: d.resolved,
        deferred: d.deferred,
      }));

      const analysisAgg = await Complaint.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$analysisStatus', count: { $sum: 1 } } },
      ]);
      const analysisStats: Record<string, number> = { queued: 0, processing: 0, completed: 0, deferred: 0 };
      analysisAgg.forEach(a => { if (a._id) analysisStats[a._id] = a.count; });

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentCount = await Complaint.countDocuments({
        ...baseFilter,
        createdAt: { $gte: oneDayAgo },
      });

      const resolutionRate = totalComplaints > 0
        ? (((resolvedCount + closedCount) / totalComplaints) * 100).toFixed(1)
        : '0';

      return {
        overview: {
          total: totalComplaints, pending: pendingCount, triage: triageCount,
          inProgress: inProgressCount, resolved: resolvedCount, closed: closedCount,
          escalated: escalatedCount, deferred: deferredCount,
          recentLast24h: recentCount, resolutionRate: `${resolutionRate}%`,
        },
        priorities: { critical: criticalCount, high: highCount, medium: mediumCount, low: lowCount },
        departments: departmentStats,
        analysis: analysisStats,
      };
    });

    return successResponse(statsData);
  } catch (err) {
    console.error('[ADMIN STATS ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
