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

    // RBAC: Creation rules per role
    // head_admin: can create head_admin, department_admin, staff
    // department_admin: can create staff within their own departments only
    // staff: cannot create any admin
    if (payload.role === 'staff') {
      return errorResponse('Staff members cannot create admin accounts', 403);
    }

    if (payload.role === 'department_admin') {
      // Department admins can only create staff
      if (parsed.data.role !== 'staff') {
        return errorResponse('Department admins can only create staff accounts', 403);
      }
      // Ensure new staff departments are a subset of creator's departments
      if (!parsed.data.departments || parsed.data.departments.length === 0) {
        return errorResponse('Staff must be assigned to at least one department', 400);
      }
      const creatorDepts = payload.departments || [];
      const invalidDepts = parsed.data.departments.filter(d => !creatorDepts.includes(d));
      if (invalidDepts.length > 0) {
        return errorResponse('You can only assign departments within your own scope', 403);
      }
    }

    if (payload.role === 'head_admin') {
      // head_admin can create any role — no extra restrictions
    }

    if (payload.role !== 'head_admin' && payload.role !== 'department_admin') {
      return errorResponse('Insufficient permissions to create admin accounts', 403);
    }

    await connectDB();

    // Validate departments for department_admin and staff roles
    if ((parsed.data.role === 'department_admin' || parsed.data.role === 'staff') && (!parsed.data.departments || parsed.data.departments.length === 0)) {
      return errorResponse('Department admin and staff must be assigned to at least one department', 400);
    }

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
      role: parsed.data.role || 'staff',
      departments: parsed.data.departments || [],
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
        role: { from: null, to: newAdmin.role },
        departments: { from: null, to: newAdmin.departments },
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
