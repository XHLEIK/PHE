import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Citizen from '@/lib/models/Citizen';
import RefreshToken from '@/lib/models/RefreshToken';
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken as genRefresh,
  hashToken,
  getRefreshTokenExpiryDate,
  setCitizenCookies,
  getCitizenRefreshTokenFromCookies,
} from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-utils';

/**
 * POST /api/citizen/auth/refresh
 * Rotates citizen tokens — same pattern as admin /api/auth/refresh
 * but reads citizen_refresh_token cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const rawToken = getCitizenRefreshTokenFromCookies(req);
    if (!rawToken) {
      return errorResponse('No refresh token provided', 401);
    }

    const payload = verifyRefreshToken(rawToken);
    if (!payload || payload.role !== 'citizen') {
      return errorResponse('Invalid or expired refresh token', 401);
    }

    await connectDB();

    // Check token not revoked
    const tokenHash = hashToken(rawToken);
    const storedToken = await RefreshToken.findOne({ tokenHash });

    if (!storedToken || storedToken.isRevoked) {
      // Possible reuse attack — revoke all tokens for this citizen
      await RefreshToken.updateMany(
        { userId: payload.userId },
        { isRevoked: true, revokedAt: new Date() }
      );
      return errorResponse('Refresh token has been revoked. Please log in again.', 401);
    }

    // Verify citizen still exists and is not locked
    const citizen = await Citizen.findById(payload.userId);
    if (!citizen || citizen.isLocked) {
      return errorResponse('Account not found or locked', 401);
    }

    // Rotate: revoke old, issue new pair
    storedToken.isRevoked = true;
    storedToken.revokedAt = new Date();
    await storedToken.save();

    const newPayload = {
      userId: citizen._id.toString(),
      email: citizen.email,
      role: 'citizen' as const,
      citizenId: citizen._id.toString(),
    };

    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = genRefresh(newPayload);

    try {
      await RefreshToken.create({
        tokenHash: hashToken(newRefreshToken),
        userId: citizen._id,
        userEmail: citizen.email,
        expiresAt: getRefreshTokenExpiryDate(),
      });
    } catch (createErr: unknown) {
      if (createErr && typeof createErr === 'object' && 'code' in createErr && (createErr as { code: number }).code === 11000) {
        // Duplicate key — race condition, safe to ignore
      } else {
        throw createErr;
      }
    }

    const cookies = setCitizenCookies(newAccessToken, newRefreshToken);
    const response = successResponse({ message: 'Tokens refreshed' });

    cookies.forEach(cookie => {
      response.headers.append('Set-Cookie', cookie);
    });

    return response;
  } catch (err) {
    console.error('[CITIZEN REFRESH ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}
