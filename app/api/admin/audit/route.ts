import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AuditLog from '@/lib/models/AuditLog';
import { verifyAccessToken } from '@/lib/auth';
import { successResponse, errorResponse, getAccessTokenFromCookies } from '@/lib/api-utils';

/**
 * GET /api/admin/audit — Read audit log entries (admin only, read-only)
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

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const action = searchParams.get('action') || undefined;
    const actor = searchParams.get('actor') || undefined;
    const targetId = searchParams.get('targetId') || undefined;

    await connectDB();

    const filter: Record<string, unknown> = {};
    if (action) filter.action = { $regex: action, $options: 'i' };
    if (actor) filter.actor = actor;
    if (targetId) filter.targetId = targetId;

    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    return successResponse(entries, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[AUDIT LOG ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
