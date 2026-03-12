import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import RefreshToken from '@/lib/models/RefreshToken';
import {
  verifyAccessToken,
  hashToken,
  clearCitizenAuthCookies,
  getCitizenAccessTokenFromCookies,
  getCitizenRefreshTokenFromCookies,
} from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-utils';

/**
 * POST /api/citizen/auth/logout
 * Revokes citizen refresh token and clears citizen cookies.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // Revoke refresh token if present
    const refreshToken = getCitizenRefreshTokenFromCookies(req);
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await RefreshToken.findOneAndUpdate(
        { tokenHash },
        { isRevoked: true, revokedAt: new Date() }
      );
    }

    // Clear citizen cookies
    const cookiesToClear = clearCitizenAuthCookies();
    const response = successResponse({ message: 'Logged out successfully' });

    cookiesToClear.forEach(cookie => {
      response.headers.append('Set-Cookie', cookie);
    });

    return response;
  } catch (err) {
    console.error('[CITIZEN LOGOUT ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
