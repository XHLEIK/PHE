import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import { verifyAccessToken } from '@/lib/auth';
import { analyticsQuerySchema } from '@/lib/validations';
import {
  successResponse,
  errorResponse,
  getAccessTokenFromCookies,
} from '@/lib/api-utils';
import { cached } from '@/lib/redis';
import { toAdminCtx, authorize, buildScopeQuery, AuthorizationError } from '@/lib/rbac';
import { PHE_DEPARTMENT_IDS } from '@/lib/constants/phe';

/**
 * GET /api/admin/analytics — Enhanced analytics with date-range, trends, SLA metrics
 */
export async function GET(req: NextRequest) {
  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);

    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid or expired token', 401);

    const adminCtx = toAdminCtx(payload);

    // Permission check — analytics:view required
    try {
      authorize(adminCtx, 'analytics:view');
    } catch (e) {
      if (e instanceof AuthorizationError) return errorResponse(e.message, 403);
      throw e;
    }

    const { searchParams } = new URL(req.url);
    const queryObj: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });

    const parsed = analyticsQuerySchema.safeParse(queryObj);
    if (!parsed.success) {
      return errorResponse('Invalid query parameters', 400,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parsed.error.issues.map((e: any) => ({
          field: String(e.path.join('.')),
          message: e.message,
        }))
      );
    }

    const { department, period, dateFrom, dateTo } = parsed.data;

    await connectDB();

    // Compute date range
    let startDate: Date;
    let endDate = new Date();

    if (period === 'custom' && dateFrom && dateTo) {
      startDate = new Date(dateFrom);
      endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }

    // Build base filter with RBAC scope
    const scopeFilter = buildScopeQuery(adminCtx);
    const baseFilter: Record<string, unknown> = {
      ...scopeFilter,
      department: { $in: PHE_DEPARTMENT_IDS },
      createdAt: { $gte: startDate, $lte: endDate },
    };

    // Additional department filter from query param
    if (department) {
      baseFilter.department = department;
    }

    // Cache key scoped to role, scope, period, date range — 5 min TTL
    const deptKey = adminCtx.departments.sort().join(',') || 'all';
    const locKey = `${adminCtx.locationScope.state || 'any'}:${adminCtx.locationScope.district || 'any'}`;
    const rangeKey = `${startDate.toISOString().slice(0, 10)}_${endDate.toISOString().slice(0, 10)}`;
    const cacheKey = `analytics:${payload.role}:${locKey}:${deptKey}:${department || 'all'}:${rangeKey}`;

    const analyticsData = await cached(cacheKey, 300, async () => {
    const statusAgg = await Complaint.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const statusDistribution: Record<string, number> = {};
    statusAgg.forEach((s) => {
      statusDistribution[s._id] = s.count;
    });

    // 2) Priority distribution
    const priorityAgg = await Complaint.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);
    const priorityDistribution: Record<string, number> = {};
    priorityAgg.forEach((p) => {
      priorityDistribution[p._id] = p.count;
    });

    // 3) Daily trend — complaints created per day
    const dailyTrend = await Complaint.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 4) Department breakdown (within date range)
    const departmentAgg = await Complaint.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [
                { $in: ['$status', ['pending', 'triage']] },
                1,
                0,
              ],
            },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] },
          },
          resolved: {
            $sum: {
              $cond: [
                { $in: ['$status', ['resolved', 'closed']] },
                1,
                0,
              ],
            },
          },
          escalated: {
            $sum: { $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0] },
          },
          slaBreached: {
            $sum: { $cond: [{ $eq: ['$slaBreached', true] }, 1, 0] },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // 5) SLA metrics
    const slaMetrics = await Complaint.aggregate([
      {
        $match: {
          ...baseFilter,
          slaDeadline: { $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          totalWithSla: { $sum: 1 },
          breached: {
            $sum: { $cond: [{ $eq: ['$slaBreached', true] }, 1, 0] },
          },
          onTrack: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$slaBreached', false] },
                    { $nin: ['$status', ['resolved', 'closed', 'withdrawn']] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const sla = slaMetrics[0] || { totalWithSla: 0, breached: 0, onTrack: 0 };
    const slaComplianceRate =
      sla.totalWithSla > 0
        ? (((sla.totalWithSla - sla.breached) / sla.totalWithSla) * 100).toFixed(1)
        : '100';

    // 6) Average resolution time (for resolved/closed in range)
    const resTimeAgg = await Complaint.aggregate([
      {
        $match: {
          ...baseFilter,
          status: { $in: ['resolved', 'closed'] },
          updatedAt: { $ne: null },
        },
      },
      {
        $project: {
          resolutionHours: {
            $divide: [
              { $subtract: ['$updatedAt', '$createdAt'] },
              1000 * 60 * 60,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgHours: { $avg: '$resolutionHours' },
          minHours: { $min: '$resolutionHours' },
          maxHours: { $max: '$resolutionHours' },
          count: { $sum: 1 },
        },
      },
    ]);

    const resTime = resTimeAgg[0] || {
      avgHours: 0,
      minHours: 0,
      maxHours: 0,
      count: 0,
    };

    // 7) Total in range
    const totalInRange = await Complaint.countDocuments(baseFilter);

      return {
        period: {
          from: startDate.toISOString(),
          to: endDate.toISOString(),
          label: period || 'custom',
        },
        overview: {
          total: totalInRange,
          statusDistribution,
          priorityDistribution,
        },
        trend: dailyTrend.map((d: { _id: string; count: number }) => ({ date: d._id, count: d.count })),
        departments: departmentAgg,
        sla: {
          totalWithSla: sla.totalWithSla,
          breached: sla.breached,
          onTrack: sla.onTrack,
          complianceRate: `${slaComplianceRate}%`,
        },
        resolutionTime: {
          avgHours: Math.round(resTime.avgHours * 10) / 10,
          minHours: Math.round(resTime.minHours * 10) / 10,
          maxHours: Math.round(resTime.maxHours * 10) / 10,
          resolvedCount: resTime.count,
        },
      };
    });

    return successResponse(analyticsData);
  } catch (err) {
    console.error('[ANALYTICS ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
