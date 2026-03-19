import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Citizen from '@/lib/models/Citizen';
import { citizenSendOtpSchema } from '@/lib/validations';
import { successResponse, errorResponse, getClientIp } from '@/lib/api-utils';
import { getOtpRateLimiter, storeOtp } from '@/lib/redis';
import { sendOtpEmail } from '@/lib/email';

/**
 * POST /api/citizen/auth/send-otp
 * Resend OTP to an existing unverified citizen account.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // Rate limit
  try {
    const limiter = getOtpRateLimiter();
    const { success } = await limiter.limit(`otp:${ip}`);
    if (!success) {
      return errorResponse('Too many OTP requests. Please wait before trying again.', 429);
    }
  } catch (err: any) {
    console.warn('[CITIZEN SEND-OTP] Redis rate limit unavailable:', err.message || err);
  }

  try {
    const body = await req.json();
    const parsed = citizenSendOtpSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Validation failed', 400,
        parsed.error.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const { email } = parsed.data;

    await connectDB();

    const citizen = await Citizen.findOne({ email });
    if (!citizen) {
      // Don't reveal whether email exists
      return successResponse({
        message: 'If an account exists with this email, a new OTP has been sent.',
      });
    }

    if (citizen.isVerified) {
      return errorResponse('Account is already verified. Please log in.', 400);
    }

    // Generate and store new OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await storeOtp(email, otpCode, 600);
    console.log(`[CITIZEN SEND-OTP] 🔑 OTP for ${email}: ${otpCode}`);

    // Send OTP email
    const emailResult = await sendOtpEmail(email, otpCode, 'registration');
    if (!emailResult.success) {
      console.error('[CITIZEN SEND-OTP] Failed to send OTP email:', emailResult.error);
    }

    const responseData: Record<string, string> = {
      message: 'If an account exists with this email, a new OTP has been sent.',
    };
    if (process.env.NODE_ENV === 'development') {
      responseData.devOtp = otpCode;
    }

    return successResponse(responseData);
  } catch (err) {
    console.error('[CITIZEN SEND-OTP ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
