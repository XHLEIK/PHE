import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { createAuditEntry } from '@/lib/models/AuditLog';
import {
  verifyAccessToken,
  verifyPassword,
  hashPassword,
} from '@/lib/auth';
import { rotatePasswordSchema } from '@/lib/validations';
import {
  successResponse,
  errorResponse,
  getAccessTokenFromCookies,
  getClientIp,
} from '@/lib/api-utils';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  const correlationId = uuidv4();
  const ip = getClientIp(req);

  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) {
      return errorResponse('Authentication required', 401);
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return errorResponse('Invalid or expired token', 401);
    }

    const body = await req.json();
    const parsed = rotatePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Validation failed', 400,
        parsed.error.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    await connectDB();

    const user = await User.findById(payload.userId).select('+passwordHash');
    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return errorResponse('Current password is incorrect', 400);
    }

    // Ensure new password is different
    const isSame = await verifyPassword(newPassword, user.passwordHash);
    if (isSame) {
      return errorResponse('New password must be different from current password', 400);
    }

    // Update password
    user.passwordHash = await hashPassword(newPassword);
    user.mustRotatePassword = false;
    await user.save();

    // Audit log
    await createAuditEntry({
      action: 'admin.password_rotated',
      actor: payload.email,
      targetType: 'user',
      targetId: user._id.toString(),
      metadata: { ip, forced: user.mustRotatePassword },
      correlationId,
      ipAddress: ip,
    });

    return successResponse({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('[AUTH ROTATE ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
