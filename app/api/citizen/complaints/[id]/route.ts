import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import {
  verifyAccessToken,
  getCitizenAccessTokenFromCookies,
} from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { PHE_DEPARTMENT_IDS } from '@/lib/constants/phe';

/**
 * GET /api/citizen/complaints/[id]
 * Returns full complaint detail for an authenticated citizen.
 * Only returns the complaint if it belongs to the citizen.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getCitizenAccessTokenFromCookies(req);
    if (!token) {
      return errorResponse('Authentication required', 401);
    }

    const payload = verifyAccessToken(token);
    if (!payload || payload.role !== 'citizen') {
      return errorResponse('Invalid or expired token', 401);
    }

    const { id } = await params;

    await connectDB();

    // Look up by complaintId (tracking ID) or _id
    // Match ownership by citizenId OR submitterEmail (for pre-registration complaints)
    const complaint = await Complaint.findOne({
      $and: [
        { $or: [{ complaintId: id }, { _id: id }] },
        { $or: [{ citizenId: payload.userId }, { submitterEmail: payload.email }] },
        { department: { $in: PHE_DEPARTMENT_IDS } },
      ],
    }).lean();

    if (!complaint) {
      return errorResponse('Complaint not found or access denied', 404);
    }

    return successResponse(complaint);
  } catch (err) {
    console.error('[CITIZEN COMPLAINT DETAIL ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
