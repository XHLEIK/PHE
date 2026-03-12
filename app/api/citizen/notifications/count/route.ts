import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import CitizenNotification from '@/lib/models/CitizenNotification';
import { verifyAccessToken, getCitizenAccessTokenFromCookies } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-utils';

/**
 * GET /api/citizen/notifications/count — Get unread notification count
 */
export async function GET(req: NextRequest) {
  const token = getCitizenAccessTokenFromCookies(req);
  if (!token) return errorResponse('Authentication required', 401);

  const payload = verifyAccessToken(token);
  if (!payload || payload.role !== 'citizen') {
    return errorResponse('Invalid or expired token', 401);
  }

  try {
    await connectDB();

    const unreadCount = await CitizenNotification.countDocuments({
      citizenId: payload.userId,
      isRead: false,
    });

    return successResponse({ unreadCount });
  } catch (err) {
    console.error('[CITIZEN NOTIFICATION COUNT ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}
