import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Citizen from '@/lib/models/Citizen';
import {
  verifyAccessToken,
  getCitizenAccessTokenFromCookies,
} from '@/lib/auth';
import { citizenUpdateProfileSchema } from '@/lib/validations';
import { successResponse, errorResponse } from '@/lib/api-utils';

/**
 * PATCH /api/citizen/profile
 * Update citizen's own profile (name, state, district).
 */
export async function PATCH(req: NextRequest) {
  try {
    const token = getCitizenAccessTokenFromCookies(req);
    if (!token) {
      return errorResponse('Authentication required', 401);
    }

    const payload = verifyAccessToken(token);
    if (!payload || payload.role !== 'citizen') {
      return errorResponse('Invalid or expired token', 401);
    }

    const body = await req.json();
    const parsed = citizenUpdateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Validation failed', 400,
        parsed.error.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    await connectDB();

    const citizen = await Citizen.findById(payload.userId);
    if (!citizen) {
      return errorResponse('Citizen not found', 404);
    }

    // Update allowed fields
    if (parsed.data.name !== undefined) citizen.name = parsed.data.name;
    if (parsed.data.state !== undefined) citizen.state = parsed.data.state;
    if (parsed.data.district !== undefined) citizen.district = parsed.data.district;

    await citizen.save();

    return successResponse({
      message: 'Profile updated successfully',
      citizen: citizen.toJSON(),
    });
  } catch (err) {
    console.error('[CITIZEN PROFILE UPDATE ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
