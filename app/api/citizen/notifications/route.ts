import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import CitizenNotification from '@/lib/models/CitizenNotification';
import { verifyAccessToken } from '@/lib/auth';
import { getCitizenAccessTokenFromCookies } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-utils';

/**
 * GET /api/citizen/notifications — List citizen notifications (paginated, newest first)
 */
export async function GET(req: NextRequest) {
  const token = getCitizenAccessTokenFromCookies(req);
  if (!token) return errorResponse('Authentication required', 401);

  const payload = verifyAccessToken(token);
  if (!payload || payload.role !== 'citizen') {
    return errorResponse('Invalid or expired token', 401);
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const unreadOnly = searchParams.get('unreadOnly') === 'true';

  try {
    await connectDB();

    const filter: Record<string, unknown> = { citizenId: payload.userId };
    if (unreadOnly) filter.isRead = false;

    const [notifications, total] = await Promise.all([
      CitizenNotification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CitizenNotification.countDocuments(filter),
    ]);

    return successResponse(notifications, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[CITIZEN NOTIFICATIONS LIST ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * PATCH /api/citizen/notifications — Mark notifications as read
 * Body: { ids: string[] } or { all: true }
 */
export async function PATCH(req: NextRequest) {
  const token = getCitizenAccessTokenFromCookies(req);
  if (!token) return errorResponse('Authentication required', 401);

  const payload = verifyAccessToken(token);
  if (!payload || payload.role !== 'citizen') {
    return errorResponse('Invalid or expired token', 401);
  }

  try {
    const body = await req.json();
    await connectDB();

    const now = new Date();

    if (body.all === true) {
      // Mark all unread as read
      const result = await CitizenNotification.updateMany(
        { citizenId: payload.userId, isRead: false },
        { $set: { isRead: true, readAt: now } }
      );
      return successResponse({ marked: result.modifiedCount });
    }

    if (Array.isArray(body.ids) && body.ids.length > 0) {
      const result = await CitizenNotification.updateMany(
        { _id: { $in: body.ids }, citizenId: payload.userId, isRead: false },
        { $set: { isRead: true, readAt: now } }
      );
      return successResponse({ marked: result.modifiedCount });
    }

    return errorResponse('Provide { all: true } or { ids: string[] }', 400);
  } catch (err) {
    console.error('[CITIZEN NOTIFICATIONS MARK READ ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}
