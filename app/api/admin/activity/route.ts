import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AuditLog from '@/lib/models/AuditLog';
import { verifyAccessToken } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  getAccessTokenFromCookies,
} from '@/lib/api-utils';
import { authorize, toAdminCtx } from '@/lib/rbac';

/**
 * GET /api/admin/activity — Activity feed (recent audit log entries)
 * Requires audit:view permission.
 */
export async function GET(req: NextRequest) {
  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);

    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid or expired token', 401);

    const adminCtx = toAdminCtx(payload);
    authorize(adminCtx, 'audit:view');

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const action = searchParams.get('action') || undefined;
    const actor = searchParams.get('actor') || undefined;

    await connectDB();

    const filter: Record<string, unknown> = {};
    if (action) filter.action = { $regex: action, $options: 'i' };
    if (actor) filter.actor = actor;

    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('action actor targetType targetId metadata createdAt')
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return successResponse(activities, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[ACTIVITY FEED ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
