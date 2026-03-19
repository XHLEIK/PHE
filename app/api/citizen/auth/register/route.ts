import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Citizen from '@/lib/models/Citizen';
import { hashPassword } from '@/lib/auth';
import { citizenRegisterSchema } from '@/lib/validations';
import { successResponse, errorResponse, getClientIp } from '@/lib/api-utils';
import { getOtpRateLimiter, storeOtp } from '@/lib/redis';
import { sendOtpEmail } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/citizen/auth/register
 * Creates a new citizen account (unverified) and sends OTP email.
 * Does NOT issue tokens — citizen must verify OTP first.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // Rate limit OTP sending
  try {
    const limiter = getOtpRateLimiter();
    const { success } = await limiter.limit(`register:${ip}`);
    if (!success) {
      return errorResponse('Too many registration attempts. Please try again later.', 429);
    }
  } catch (err: any) {
    console.warn('[CITIZEN REGISTER] Redis rate limit unavailable:', err.message || err);
  }

  try {
    const body = await req.json();
    const parsed = citizenRegisterSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Validation failed', 400,
        parsed.error.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const { name, phone, email, password, state, district } = parsed.data;

    await connectDB();

    // Check if email or phone already exists
    const existing = await Citizen.findOne({ $or: [{ email }, { phone }] });
    if (existing) {
      // If the SAME email exists but is NOT verified, re-send OTP instead of blocking
      if (existing.email === email && !existing.isVerified) {
        // Update the record in case name/phone/password changed
        existing.name = name;
        existing.phone = phone;
        existing.passwordHash = await hashPassword(password);
        existing.state = state || '';
        existing.district = district || '';
        await existing.save();

        // Generate and send a fresh OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        await storeOtp(email, otpCode, 600);
        console.log(`[CITIZEN REGISTER] 🔑 OTP for ${email}: ${otpCode}`);

        const emailResult = await sendOtpEmail(email, otpCode, 'registration');
        if (!emailResult.success) {
          console.error('[CITIZEN REGISTER] Failed to send OTP email:', emailResult.error);
        }

        const responseData: Record<string, string> = {
          message: 'Registration successful. Please verify your email with the OTP sent.',
          email,
        };
        // In dev mode, include OTP in response so the UI can show it
        if (process.env.NODE_ENV === 'development') {
          responseData.devOtp = otpCode;
        }

        return successResponse(responseData, undefined, 201);
      }

      if (existing.email === email) {
        return errorResponse('An account with this email already exists. Please log in.', 409);
      }
      return errorResponse('An account with this phone number already exists.', 409);
    }

    // Hash password and create citizen (unverified)
    const passwordHash = await hashPassword(password);

    await Citizen.create({
      name,
      phone,
      email,
      passwordHash,
      state: state || '',
      district: district || '',
      isVerified: false,
    });

    // Generate 6-digit OTP and store in Redis (10 min TTL)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await storeOtp(email, otpCode, 600);
    console.log(`[CITIZEN REGISTER] 🔑 OTP for ${email}: ${otpCode}`);

    // Send OTP email
    const emailResult = await sendOtpEmail(email, otpCode, 'registration');
    if (!emailResult.success) {
      console.error('[CITIZEN REGISTER] Failed to send OTP email:', emailResult.error);
      // Don't fail the registration — citizen can resend OTP
    }

    const responseData: Record<string, string> = {
      message: 'Registration successful. Please verify your email with the OTP sent.',
      email,
    };
    // In dev mode, include OTP in response so the UI can show it
    if (process.env.NODE_ENV === 'development') {
      responseData.devOtp = otpCode;
    }

    return successResponse(responseData, undefined, 201);
  } catch (err) {
    console.error('[CITIZEN REGISTER ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
