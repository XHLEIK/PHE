import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Notification from '@/lib/models/Notification';
import { verifyAccessToken } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  getAccessTokenFromCookies,
} from '@/lib/api-utils';

/**
 * GET /api/admin/notifications/count — Unread notification count for current admin
 * Lightweight endpoint for badge polling.
 */
export async function GET(req: NextRequest) {
  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);

    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid or expired token', 401);

    await connectDB();

    const unreadCount = await Notification.countDocuments({
      recipientEmail: payload.email,
      isRead: false,
    });

    return successResponse({ unreadCount });
  } catch (err) {
    console.error('[NOTIFICATION COUNT ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
