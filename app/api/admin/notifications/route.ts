import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Notification from '@/lib/models/Notification';
import { verifyAccessToken } from '@/lib/auth';
import { notificationQuerySchema } from '@/lib/validations';
import {
  successResponse,
  errorResponse,
  getAccessTokenFromCookies,
} from '@/lib/api-utils';

/**
 * GET /api/admin/notifications — List notifications for the current admin
 */
export async function GET(req: NextRequest) {
  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);

    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid or expired token', 401);

    const url = new URL(req.url);
    const query = Object.fromEntries(url.searchParams);
    const parsed = notificationQuerySchema.safeParse(query);

    if (!parsed.success) {
      return errorResponse('Invalid query parameters', 400);
    }

    const { page, limit, isRead, type } = parsed.data;

    await connectDB();

    const filter: Record<string, unknown> = { recipientEmail: payload.email };
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    if (type) filter.type = type;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
    ]);

    return successResponse(notifications, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[NOTIFICATIONS LIST ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * PATCH /api/admin/notifications — Mark notification(s) as read
 * Body: { notificationId: string } or { markAllRead: true }
 */
export async function PATCH(req: NextRequest) {
  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);

    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid or expired token', 401);

    const body = await req.json();

    await connectDB();

    if (body.markAllRead) {
      const result = await Notification.updateMany(
        { recipientEmail: payload.email, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      );
      return successResponse({ message: 'All notifications marked as read', count: result.modifiedCount });
    }

    if (body.notificationId) {
      const notification = await Notification.findOneAndUpdate(
        { _id: body.notificationId, recipientEmail: payload.email },
        { $set: { isRead: true, readAt: new Date() } },
        { returnDocument: 'after' }
      );
      if (!notification) return errorResponse('Notification not found', 404);
      return successResponse(notification);
    }

    return errorResponse('Provide notificationId or markAllRead: true', 400);
  } catch (err) {
    console.error('[NOTIFICATIONS PATCH ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
