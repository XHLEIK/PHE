import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import { verifyAccessToken } from '@/lib/auth';
import { errorResponse, successResponse, getAccessTokenFromCookies } from '@/lib/api-utils';
import { authorize, toAdminCtx } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);

    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid token', 401);

    const adminCtx = toAdminCtx(payload);
    authorize(adminCtx, 'complaint:view');

    const searchParams = req.nextUrl.searchParams;
    const department = searchParams.get('department');

    await connectDB();

    const matchStage: any = {
      // Fetch all regardless of status or incident key so legacy and resolved show up
    };

    if (department) {
      matchStage.department = department;
    }

    const incidents = await Complaint.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            loc: { $ifNull: [{ $cond: { if: { $eq: ['$district', ''] }, then: '$location', else: '$district' } }, 'Unknown Area'] },
            category: '$category',
            department: '$department',
          },
          location: { $first: { $ifNull: [{ $cond: { if: { $eq: ['$district', ''] }, then: '$location', else: '$district' } }, 'Unknown Area'] } },
          category: { $first: '$category' },
          department: { $first: '$department' },
          priority: { $max: '$priority' },
          // If it's a deduplicated incident, use complaintCount, else 1
          complaintCount: { $sum: { $ifNull: ['$complaintCount', 1] } },
          resolvedCount: {
            $sum: {
              $cond: [{ $in: ['$status', ['resolved', 'closed']] }, { $ifNull: ['$complaintCount', 1] }, 0]
            }
          },
          pendingCount: {
            $sum: {
              $cond: [{ $in: ['$status', ['pending', 'triage', 'in_progress']] }, { $ifNull: ['$complaintCount', 1] }, 0]
            }
          },
          firstReported: { $min: '$createdAt' }
        }
      },
      { $sort: { pendingCount: -1, complaintCount: -1, firstReported: -1 } }
    ]);

    return successResponse(incidents);
  } catch (err: any) {
    console.error('[INCIDENTS GET ERROR]', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
