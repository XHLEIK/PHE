import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import Department from '@/lib/models/Department';
import { verifyAccessToken } from '@/lib/auth';
import { successResponse, errorResponse, getAccessTokenFromCookies } from '@/lib/api-utils';

/**
 * GET /api/admin/stats — Aggregated dashboard statistics (admin only)
 * Department-admin: scoped to their departments only
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

    await connectDB();

    // Build base filter — department_admin and staff see only their departments
    const baseFilter: Record<string, unknown> = {};
    if ((payload.role === 'department_admin' || payload.role === 'staff') && payload.departments?.length) {
      baseFilter.department = { $in: payload.departments };
    }

    const [
      totalComplaints,
      pendingCount,
      triageCount,
      inProgressCount,
      resolvedCount,
      closedCount,
      escalatedCount,
      deferredCount,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
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

    // Department breakdown using aggregation — aligned with canonical department IDs
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

    // Merge with DB department labels for display names
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

    // Analysis status breakdown
    const analysisAgg = await Complaint.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$analysisStatus', count: { $sum: 1 } } },
    ]);
    const analysisStats: Record<string, number> = { queued: 0, processing: 0, completed: 0, deferred: 0 };
    analysisAgg.forEach(a => { if (a._id) analysisStats[a._id] = a.count; });

    // Recent complaints (last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await Complaint.countDocuments({
      ...baseFilter,
      createdAt: { $gte: oneDayAgo },
    });

    // Resolution rate
    const resolutionRate = totalComplaints > 0
      ? (((resolvedCount + closedCount) / totalComplaints) * 100).toFixed(1)
      : '0';

    return successResponse({
      overview: {
        total: totalComplaints,
        pending: pendingCount,
        triage: triageCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
        closed: closedCount,
        escalated: escalatedCount,
        deferred: deferredCount,
        recentLast24h: recentCount,
        resolutionRate: `${resolutionRate}%`,
      },
      priorities: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
      departments: departmentStats,
      analysis: analysisStats,
    });
  } catch (err) {
    console.error('[ADMIN STATS ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
