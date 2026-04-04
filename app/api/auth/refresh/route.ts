import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import RefreshToken from '@/lib/models/RefreshToken';
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken as genRefresh,
  hashToken,
  getRefreshTokenExpiryDate,
} from '@/lib/auth';
import { successResponse, errorResponse, getClientIp } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  try {
    const refreshTokenCookie = req.cookies.get('refresh_token');
    if (!refreshTokenCookie?.value) {
      return errorResponse('No refresh token provided', 401);
    }

    const rawToken = refreshTokenCookie.value;
    const payload = verifyRefreshToken(rawToken);
    if (!payload) {
      return errorResponse('Invalid or expired refresh token', 401);
    }

    await connectDB();

    // Check that the token hasn't been revoked
    const tokenHash = hashToken(rawToken);
    const storedToken = await RefreshToken.findOne({ tokenHash });

    if (!storedToken || storedToken.isRevoked) {
      // Possible token reuse attack — revoke all tokens for this user
      await RefreshToken.updateMany(
        { userId: payload.userId },
        { isRevoked: true, revokedAt: new Date() }
      );
      return errorResponse('Refresh token has been revoked. Please log in again.', 401);
    }

    // Verify user still exists and is not locked
    const user = await User.findById(payload.userId);
    if (!user || user.isLocked) {
      return errorResponse('Account not found or locked', 401);
    }

    // Rotate: revoke old token, issue new pair
    storedToken.isRevoked = true;
    storedToken.revokedAt = new Date();
    await storedToken.save();

    const newPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      departments: user.departments || [],
      locationScope: user.locationScope || {},
    };

    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = genRefresh(newPayload);

    try {
      await RefreshToken.create({
        tokenHash: hashToken(newRefreshToken),
        userId: user._id,
        userEmail: user.email,
        expiresAt: getRefreshTokenExpiryDate(),
      });
    } catch (createErr: unknown) {
      // Handle race condition: if another concurrent refresh already created a token
      if (createErr && typeof createErr === 'object' && 'code' in createErr && (createErr as { code: number }).code === 11000) {
        // Duplicate key — token was already stored by a parallel request; safe to ignore
      } else {
        throw createErr;
      }
    }

    const isProduction = process.env.NODE_ENV === 'production' && process.env.HTTPS_ENABLED === 'true';
    const securePart = isProduction ? 'Secure; ' : '';

    const response = successResponse({ message: 'Tokens refreshed' });

    response.headers.set(
      'Set-Cookie',
      `access_token=${newAccessToken}; HttpOnly; ${securePart}SameSite=Strict; Path=/; Max-Age=900`
    );
    response.headers.append(
      'Set-Cookie',
      `refresh_token=${newRefreshToken}; HttpOnly; ${securePart}SameSite=Strict; Path=/api/auth; Max-Age=604800`
    );

    return response;
  } catch (err) {
    console.error('[AUTH REFRESH ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
