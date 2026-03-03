import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { verifyAccessToken } from '@/lib/auth';
import { successResponse, errorResponse, getAccessTokenFromCookies } from '@/lib/api-utils';

/**
 * GET /api/auth/me — return the current authenticated user profile
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

    const user = await User.findById(payload.userId);
    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse({
      user: user.toJSON(),
      mustRotatePassword: user.mustRotatePassword,
    });
  } catch (err) {
    console.error('[AUTH ME ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
