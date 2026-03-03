import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import { verifyAccessToken } from '@/lib/auth';
import { successResponse, errorResponse, getAccessTokenFromCookies } from '@/lib/api-utils';

/**
 * GET /api/admin/stats — Aggregated dashboard statistics (admin only)
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

    const [
      totalComplaints,
      pendingCount,
      triageCount,
      inProgressCount,
      resolvedCount,
      closedCount,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
    ] = await Promise.all([
      Complaint.countDocuments({}),
      Complaint.countDocuments({ status: 'pending' }),
      Complaint.countDocuments({ status: 'triage' }),
      Complaint.countDocuments({ status: 'in_progress' }),
      Complaint.countDocuments({ status: 'resolved' }),
      Complaint.countDocuments({ status: 'closed' }),
      Complaint.countDocuments({ priority: 'critical' }),
      Complaint.countDocuments({ priority: 'high' }),
      Complaint.countDocuments({ priority: 'medium' }),
      Complaint.countDocuments({ priority: 'low' }),
    ]);

    // Category breakdown
    const categoryBreakdown = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Department breakdown
    const departmentBreakdown = await Complaint.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Recent complaints (last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await Complaint.countDocuments({
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
        recentLast24h: recentCount,
        resolutionRate: `${resolutionRate}%`,
      },
      priorities: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
      categories: categoryBreakdown.map(c => ({ category: c._id, count: c.count })),
      departments: departmentBreakdown.map(d => ({ department: d._id, count: d.count })),
    });
  } catch (err) {
    console.error('[ADMIN STATS ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
