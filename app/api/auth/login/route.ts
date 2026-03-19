import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import RefreshToken from '@/lib/models/RefreshToken';
import { createAuditEntry } from '@/lib/models/AuditLog';
import {
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiryDate,
} from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import {
  successResponse,
  errorResponse,
  getClientIp,
} from '@/lib/api-utils';
import { getLoginRateLimiter } from '@/lib/redis';
import { v4 as uuidv4 } from 'uuid';
import { normalizeAdminRole } from '@/lib/rbac';

const MAX_FAILED_ATTEMPTS = 5;
const LOGIN_WINDOW = parseInt(process.env.LOGIN_LOCKOUT_DURATION_MS || '900000', 10);

export async function POST(req: NextRequest) {
  const correlationId = uuidv4();
  const ip = getClientIp(req);

  // Redis-backed rate limit: per-IP
  try {
    const limiter = getLoginRateLimiter();
    const { success } = await limiter.limit(`login:${ip}`);
    if (!success) {
      return errorResponse(
        'Too many login attempts. Please try again later.',
        429
      );
    }
  } catch (rlErr) {
    console.warn('[AUTH LOGIN] Redis rate limit unavailable, allowing request:', rlErr);
  }

  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Validation failed', 400, 
        parsed.error.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const { email, password } = parsed.data;

    await connectDB();

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return errorResponse('Invalid credentials', 401);
    }

    // Check account lockout
    if (user.isLocked && user.lockUntil && user.lockUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      await createAuditEntry({
        action: 'admin.login_locked',
        actor: email,
        targetType: 'user',
        targetId: user._id.toString(),
        metadata: { ip, minutesLeft },
        correlationId,
        ipAddress: ip,
      });
      return errorResponse(
        `Account is locked. Try again in ${minutesLeft} minute(s).`,
        423
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      // Increment failed attempts with exponential backoff
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        // Exponential backoff: 15min * 2^(failures - MAX)
        const backoffMultiplier = Math.pow(2, user.failedLoginAttempts - MAX_FAILED_ATTEMPTS);
        const lockDuration = LOGIN_WINDOW * backoffMultiplier;
        user.isLocked = true;
        user.lockUntil = new Date(Date.now() + lockDuration);
      }
      await user.save();

      await createAuditEntry({
        action: 'admin.login_failed',
        actor: email,
        targetType: 'user',
        targetId: user._id.toString(),
        metadata: { ip, attempts: user.failedLoginAttempts },
        correlationId,
        ipAddress: ip,
      });

      return errorResponse('Invalid credentials', 401);
    }

    // Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.isLocked = false;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    user.lastLoginIP = ip;
    await user.save();

    const normalizedRole = normalizeAdminRole(String(user.role || ''));
    if (user.role !== normalizedRole) {
      user.role = normalizedRole;
      await user.save();
    }

    // Generate tokens — include departments + locationScope for RBAC-scoped roles
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: normalizedRole,
      departments: user.departments || [],
      locationScope: user.locationScope || {},
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshTokenStr = generateRefreshToken(tokenPayload);

    // Store refresh token hash in DB for revocation support
    await RefreshToken.create({
      tokenHash: hashToken(refreshTokenStr),
      userId: user._id,
      userEmail: user.email,
      expiresAt: getRefreshTokenExpiryDate(),
    });

    // Audit log
    await createAuditEntry({
      action: 'admin.login',
      actor: email,
      targetType: 'user',
      targetId: user._id.toString(),
      metadata: { ip },
      correlationId,
      ipAddress: ip,
    });

    // Build response with httpOnly cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const securePart = isProduction ? 'Secure; ' : '';

    const response = successResponse({
      user: user.toJSON(),
      mustRotatePassword: user.mustRotatePassword,
    });

    response.headers.set(
      'Set-Cookie',
      `access_token=${accessToken}; HttpOnly; ${securePart}SameSite=Strict; Path=/; Max-Age=900`
    );
    response.headers.append(
      'Set-Cookie',
      `refresh_token=${refreshTokenStr}; HttpOnly; ${securePart}SameSite=Strict; Path=/api/auth; Max-Age=604800`
    );

    return response;
  } catch (err) {
    console.error('[AUTH LOGIN ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
