import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { createAuditEntry } from '@/lib/models/AuditLog';
import { verifyAccessToken, hashPassword } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  getAccessTokenFromCookies,
  getClientIp,
} from '@/lib/api-utils';
import { v4 as uuidv4 } from 'uuid';
import { authorize, toAdminCtx, outranks, type AdminRole } from '@/lib/rbac';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/users/[id]/reset-password
 * Force-reset an admin user's password.
 * Requires user:update permission and must outrank the target user.
 * Sets mustRotatePassword = true so user must change on next login.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const correlationId = uuidv4();
  const ip = getClientIp(req);

  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);

    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid or expired token', 401);

    const adminCtx = toAdminCtx(payload);
    authorize(adminCtx, 'user:update');

    const { id } = await context.params;
    const body = await req.json();
    const { temporaryPassword } = body;

    if (
      !temporaryPassword ||
      typeof temporaryPassword !== 'string' ||
      temporaryPassword.length < 12
    ) {
      return errorResponse('Temporary password must be at least 12 characters', 400);
    }

    await connectDB();
    const targetUser = await User.findById(id);
    if (!targetUser) return errorResponse('User not found', 404);

    // Cannot reset own password via this route (use rotate-password instead)
    if (targetUser.email === payload.email) {
      return errorResponse('Use the password rotation endpoint for your own account', 400);
    }

    // Must outrank the target user
    if (!outranks(adminCtx.role, targetUser.role as AdminRole)) {
      return errorResponse('You cannot reset the password of someone at or above your rank', 403);
    }

    // Department scope check for department-scoped roles
    if (adminCtx.departments.length > 0 && targetUser.departments.length > 0) {
      const overlap = targetUser.departments.some((d: string) => adminCtx.departments.includes(d));
      if (!overlap) {
        return errorResponse('User is not within your department scope', 403);
      }
    }

    const hashedPassword = await hashPassword(temporaryPassword);
    targetUser.passwordHash = hashedPassword;
    targetUser.mustRotatePassword = true;
    targetUser.failedLoginAttempts = 0;
    targetUser.isLocked = false;
    targetUser.lockUntil = null;
    await targetUser.save();

    // Audit log
    await createAuditEntry({
      action: 'admin.password_reset',
      actor: payload.email,
      targetType: 'user',
      targetId: targetUser._id.toString(),
      changes: { passwordHash: { from: '[REDACTED]', to: '[REDACTED]' } },
      metadata: { resetBy: payload.email, mustRotatePassword: true },
      correlationId,
      ipAddress: ip,
    });

    return successResponse({ message: 'Password reset successfully. User must change password on next login.' });
  } catch (err) {
    console.error('[ADMIN PASSWORD RESET ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
