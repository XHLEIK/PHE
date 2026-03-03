import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { createAuditEntry } from '@/lib/models/AuditLog';
import { verifyAccessToken, hashPassword } from '@/lib/auth';
import { createAdminSchema } from '@/lib/validations';
import {
  successResponse,
  errorResponse,
  getAccessTokenFromCookies,
  getClientIp,
} from '@/lib/api-utils';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/admin/users — List all admin users (admin only)
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

    await connectDB();

    const admins = await User.find({}).select('-passwordHash -__v').sort({ createdAt: -1 }).lean();

    return successResponse(admins);
  } catch (err) {
    console.error('[ADMIN USERS LIST ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * POST /api/admin/users — Create a new admin user (admin only)
 */
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
    const parsed = createAdminSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Validation failed', 400,
        parsed.error.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    await connectDB();

    // Check if email already exists
    const existing = await User.findOne({ email: parsed.data.email });
    if (existing) {
      return errorResponse('An admin with this email already exists', 409);
    }

    const hashedPassword = await hashPassword(parsed.data.temporaryPassword);

    const newAdmin = await User.create({
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash: hashedPassword,
      role: 'admin',
      securityLevel: parsed.data.securityLevel,
      mustRotatePassword: true, // Force password change on first login
      createdBy: payload.email,
      isSeeded: false,
    });

    // Audit log
    await createAuditEntry({
      action: 'admin.created',
      actor: payload.email,
      targetType: 'user',
      targetId: newAdmin._id.toString(),
      changes: {
        email: { from: null, to: newAdmin.email },
        name: { from: null, to: newAdmin.name },
        securityLevel: { from: null, to: newAdmin.securityLevel },
      },
      metadata: { createdBy: payload.email },
      correlationId,
      ipAddress: ip,
    });

    return successResponse(newAdmin.toJSON(), undefined, 201);
  } catch (err) {
    console.error('[ADMIN CREATE ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
