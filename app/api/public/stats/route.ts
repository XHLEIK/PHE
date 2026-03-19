import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import { PHE_DEPARTMENT_IDS } from '@/lib/constants/phe';

/**
 * GET /api/public/stats — Public transparency stats (no auth)
 * Returns aggregated stats: counts by status, department, resolution rate, etc.
 * No PII is exposed.
 */
export async function GET() {
  try {
    await connectDB();

    const baseFilter = { department: { $in: PHE_DEPARTMENT_IDS } };

    const [
      total,
      pending,
      inProgress,
      resolved,
      closed,
      escalated,
      deptStats,
      priorityStats,
      last7Days,
    ] = await Promise.all([
      Complaint.countDocuments(baseFilter),
      Complaint.countDocuments({ ...baseFilter, status: 'pending' }),
      Complaint.countDocuments({ ...baseFilter, status: 'in_progress' }),
      Complaint.countDocuments({ ...baseFilter, status: 'resolved' }),
      Complaint.countDocuments({ ...baseFilter, status: 'closed' }),
      Complaint.countDocuments({ ...baseFilter, status: 'escalated' }),
      Complaint.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Complaint.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Complaint.countDocuments({
        ...baseFilter,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    const resolutionRate = total > 0
      ? ((resolved + closed) / total * 100).toFixed(1)
      : '0.0';

    const departments = deptStats.map((d: { _id: string; count: number }) => ({
      name: d._id || 'Unassigned',
      count: d.count,
    }));

    const priorities = Object.fromEntries(
      priorityStats.map((p: { _id: string; count: number }) => [p._id || 'unknown', p.count])
    );

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total,
          pending,
          inProgress,
          resolved,
          closed,
          escalated,
          resolutionRate: `${resolutionRate}%`,
          last7Days,
        },
        departments,
        priorities,
        generatedAt: new Date().toISOString(),
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    console.error('[PUBLIC STATS ERROR]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load statistics' },
      { status: 500 }
    );
  }
}
