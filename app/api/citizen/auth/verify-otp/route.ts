import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Citizen from '@/lib/models/Citizen';
import RefreshToken from '@/lib/models/RefreshToken';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiryDate,
  setCitizenCookies,
} from '@/lib/auth';
import { citizenVerifyOtpSchema } from '@/lib/validations';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { verifyOtp } from '@/lib/redis';
import { sendWelcomeEmail } from '@/lib/email';

/**
 * POST /api/citizen/auth/verify-otp
 * Verifies the OTP code and activates the citizen account.
 * Issues JWT tokens on successful verification.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = citizenVerifyOtpSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Validation failed', 400,
        parsed.error.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const { email, code } = parsed.data;

    // Verify OTP from Redis (one-time use)
    const isValid = await verifyOtp(email, code);
    if (!isValid) {
      return errorResponse('Invalid or expired OTP code. Please request a new one.', 400);
    }

    await connectDB();

    // Find and activate citizen
    const citizen = await Citizen.findOne({ email });
    if (!citizen) {
      return errorResponse('Account not found', 404);
    }

    if (citizen.isVerified) {
      return errorResponse('Account is already verified. Please log in.', 400);
    }

    citizen.isVerified = true;
    citizen.lastLoginAt = new Date();
    await citizen.save();

    // Issue JWT tokens
    const tokenPayload = {
      userId: citizen._id.toString(),
      email: citizen.email,
      role: 'citizen' as const,
      citizenId: citizen._id.toString(),
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshTokenStr = generateRefreshToken(tokenPayload);

    // Store refresh token hash
    await RefreshToken.create({
      tokenHash: hashToken(refreshTokenStr),
      userId: citizen._id,
      userEmail: citizen.email,
      expiresAt: getRefreshTokenExpiryDate(),
    });

    // Send welcome email (fire-and-forget)
    sendWelcomeEmail(citizen.email, citizen.name).catch(err => {
      console.error('[CITIZEN VERIFY-OTP] Welcome email failed:', err);
    });

    // Set citizen cookies
    const cookies = setCitizenCookies(accessToken, refreshTokenStr);
    const response = successResponse({
      message: 'Email verified successfully. Welcome!',
      citizen: citizen.toJSON(),
    });

    cookies.forEach(cookie => {
      response.headers.append('Set-Cookie', cookie);
    });

    return response;
  } catch (err) {
    console.error('[CITIZEN VERIFY-OTP ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
