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
import {
  toAdminCtx,
  authorize,
  buildAdminScopeQuery,
  canCreateRole,
  scopeContains,
  validateLocationForRole,
  ROLE_META,
  AuthorizationError,
} from '@/lib/rbac';
import type { AdminRole } from '@/lib/rbac';

/**
 * GET /api/admin/users — List admin users (scope-filtered by RBAC)
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

    const adminCtx = toAdminCtx(payload);

    try {
      authorize(adminCtx, 'user:view');
    } catch (e) {
      if (e instanceof AuthorizationError) return errorResponse(e.message, 403);
      throw e;
    }

    await connectDB();

    const scopeFilter = buildAdminScopeQuery(adminCtx);
    const admins = await User.find(scopeFilter)
      .select('-passwordHash -__v')
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(admins);
  } catch (err) {
    console.error('[ADMIN USERS LIST ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * POST /api/admin/users — Create a new admin user (RBAC-controlled)
 *
 * Enforces:
 *   - Creator must have 'user:create' permission
 *   - CREATION_MATRIX: role hierarchy check
 *   - Scope containment: target scope must be within creator's scope
 *   - Location validation: required fields per role
 *   - Department constraint: department-scoped roles need at least 1 department
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

    const adminCtx = toAdminCtx(payload);

    // 1. Permission check
    try {
      authorize(adminCtx, 'user:create');
    } catch (e) {
      if (e instanceof AuthorizationError) return errorResponse(e.message, 403);
      throw e;
    }

    const body = await req.json();
    const parsed = createAdminSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Validation failed', 400,
        parsed.error.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const targetRole = parsed.data.role as AdminRole;

    // 2. Creation matrix check
    if (!canCreateRole(adminCtx.role, targetRole)) {
      return errorResponse(
        `Your role (${adminCtx.role}) cannot create ${targetRole} accounts`,
        403
      );
    }

    // 3. Scope containment: target location must be within creator's scope
    const targetScope = targetRole === 'head_admin'
      ? {}
      : {
          ...(parsed.data.locationScope || {}),
          country: 'India',
          state: 'Arunachal Pradesh',
        };
    const targetScopeCtx = { role: targetRole, departments: parsed.data.departments || [], locationScope: targetScope };
    if (!scopeContains(adminCtx, targetScopeCtx)) {
      return errorResponse(
        'Target location scope must be within your own jurisdiction',
        403
      );
    }

    // 4. Department scope: if creator is department-scoped, target depts must be a subset
    if (adminCtx.departments.length > 0 && parsed.data.departments?.length) {
      const invalidDepts = parsed.data.departments.filter(d => !adminCtx.departments.includes(d));
      if (invalidDepts.length > 0) {
        return errorResponse('You can only assign departments within your own scope', 403);
      }
    }

    // 5. Validate location fields required by target role
    const locResult = validateLocationForRole(targetRole, targetScope);
    if (!locResult.valid) {
      return errorResponse(`Missing required location fields for ${targetRole}: ${locResult.missing.join(', ')}`, 400);
    }

    // 6. Department requirement for department-scoped roles
    const meta = ROLE_META[targetRole];
    if (meta.requiresDepartment && (!parsed.data.departments || parsed.data.departments.length === 0)) {
      return errorResponse(`${meta.label} must be assigned to at least one department`, 400);
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
      role: targetRole,
      departments: parsed.data.departments || [],
      locationScope: targetScope,
      phone: parsed.data.phone || '',
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
        locationScope: { from: null, to: newAdmin.locationScope },
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
