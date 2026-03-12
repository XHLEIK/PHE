import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Citizen from '@/lib/models/Citizen';
import {
  verifyAccessToken,
  getCitizenAccessTokenFromCookies,
} from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-utils';

/**
 * GET /api/citizen/auth/me
 * Returns the current authenticated citizen's profile.
 */
export async function GET(req: NextRequest) {
  try {
    const token = getCitizenAccessTokenFromCookies(req);
    if (!token) {
      return errorResponse('Authentication required', 401);
    }

    const payload = verifyAccessToken(token);
    if (!payload || payload.role !== 'citizen') {
      return errorResponse('Invalid or expired token', 401);
    }

    await connectDB();

    const citizen = await Citizen.findById(payload.userId);
    if (!citizen) {
      return errorResponse('Citizen not found', 404);
    }

    return successResponse({
      citizen: citizen.toJSON(),
    });
  } catch (err) {
    console.error('[CITIZEN ME ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
