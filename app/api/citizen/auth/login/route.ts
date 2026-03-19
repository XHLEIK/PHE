import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Citizen from '@/lib/models/Citizen';
import RefreshToken from '@/lib/models/RefreshToken';
import {
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiryDate,
  setCitizenCookies,
} from '@/lib/auth';
import { citizenLoginSchema } from '@/lib/validations';
import { successResponse, errorResponse, getClientIp } from '@/lib/api-utils';
import { getLoginRateLimiter } from '@/lib/redis';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = parseInt(process.env.LOGIN_LOCKOUT_DURATION_MS || '900000', 10);

/**
 * POST /api/citizen/auth/login
 * Authenticates a verified citizen and issues JWT tokens.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // Redis-backed rate limit
  try {
    const limiter = getLoginRateLimiter();
    const { success } = await limiter.limit(`citizen-login:${ip}`);
    if (!success) {
      return errorResponse('Too many login attempts. Please try again later.', 429);
    }
  } catch (err: any) {
    console.warn('[CITIZEN LOGIN] Redis rate limit unavailable:', err.message || err);
  }

  try {
    const body = await req.json();
    const parsed = citizenLoginSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Validation failed', 400,
        parsed.error.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const { email, password } = parsed.data;

    await connectDB();

    const citizen = await Citizen.findOne({ email }).select('+passwordHash');
    if (!citizen) {
      return errorResponse('Invalid credentials', 401);
    }

    // Must be verified
    if (!citizen.isVerified) {
      return errorResponse('Please verify your email before logging in. Check your inbox for the OTP.', 403);
    }

    // Check account lockout
    if (citizen.isLocked && citizen.lockUntil && citizen.lockUntil > new Date()) {
      const minutesLeft = Math.ceil((citizen.lockUntil.getTime() - Date.now()) / 60000);
      return errorResponse(
        `Account is locked. Try again in ${minutesLeft} minute(s).`,
        423
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, citizen.passwordHash);
    if (!isValid) {
      citizen.failedLoginAttempts += 1;
      if (citizen.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        const backoffMultiplier = Math.pow(2, citizen.failedLoginAttempts - MAX_FAILED_ATTEMPTS);
        citizen.isLocked = true;
        citizen.lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS * backoffMultiplier);
      }
      await citizen.save();
      return errorResponse('Invalid credentials', 401);
    }

    // Reset failed attempts on success
    citizen.failedLoginAttempts = 0;
    citizen.isLocked = false;
    citizen.lockUntil = null;
    citizen.lastLoginAt = new Date();
    await citizen.save();

    // Generate tokens
    const tokenPayload = {
      userId: citizen._id.toString(),
      email: citizen.email,
      role: 'citizen' as const,
      citizenId: citizen._id.toString(),
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshTokenStr = generateRefreshToken(tokenPayload);

    // Store refresh token
    await RefreshToken.create({
      tokenHash: hashToken(refreshTokenStr),
      userId: citizen._id,
      userEmail: citizen.email,
      expiresAt: getRefreshTokenExpiryDate(),
    });

    // Set citizen cookies
    const cookies = setCitizenCookies(accessToken, refreshTokenStr);
    const response = successResponse({
      citizen: citizen.toJSON(),
    });

    cookies.forEach(cookie => {
      response.headers.append('Set-Cookie', cookie);
    });

    return response;
  } catch (err) {
    console.error('[CITIZEN LOGIN ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
