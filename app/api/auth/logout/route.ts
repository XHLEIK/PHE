import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import RefreshToken from '@/lib/models/RefreshToken';
import { createAuditEntry } from '@/lib/models/AuditLog';
import { hashToken, clearAuthCookies } from '@/lib/auth';
import { successResponse, errorResponse, getClientIp } from '@/lib/api-utils';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  const correlationId = uuidv4();
  const ip = getClientIp(req);

  try {
    await connectDB();

    // Revoke refresh token if present
    const refreshTokenCookie = req.cookies.get('refresh_token');
    if (refreshTokenCookie?.value) {
      const tokenHash = hashToken(refreshTokenCookie.value);
      await RefreshToken.findOneAndUpdate(
        { tokenHash },
        { isRevoked: true, revokedAt: new Date() }
      );
    }

    // Try to get user info for audit from access token cookie
    const accessTokenCookie = req.cookies.get('access_token');
    let actor = 'unknown';
    if (accessTokenCookie?.value) {
      const { verifyAccessToken } = await import('@/lib/auth');
      const payload = verifyAccessToken(accessTokenCookie.value);
      if (payload) {
        actor = payload.email;
      }
    }

    await createAuditEntry({
      action: 'admin.logout',
      actor,
      targetType: 'user',
      targetId: actor,
      correlationId,
      ipAddress: ip,
    });

    // Clear cookies
    const cookiesToClear = clearAuthCookies();
    const response = successResponse({ message: 'Logged out successfully' });
    
    cookiesToClear.forEach((cookie) => {
      response.headers.append('Set-Cookie', cookie);
    });

    return response;
  } catch (err) {
    console.error('[AUTH LOGOUT ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
