import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import RefreshToken from '@/lib/models/RefreshToken';
import { createAuditEntry } from '@/lib/models/AuditLog';
import { verifyAccessToken } from '@/lib/auth';
import { updateAdminUserSchema } from '@/lib/validations';
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
  canCreateRole,
  outranks,
  scopeContains,
  AuthorizationError,
} from '@/lib/rbac';
import type { AdminRole } from '@/lib/rbac';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Helper: verify admin token and return payload
// ---------------------------------------------------------------------------
async function authenticateAdmin(req: NextRequest) {
  const token = getAccessTokenFromCookies(req);
  if (!token) return null;
  return verifyAccessToken(token);
}

/**
 * GET /api/admin/users/[id] — Get a single admin user by ID (RBAC-controlled)
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const payload = await authenticateAdmin(req);
    if (!payload) return errorResponse('Authentication required', 401);

    const adminCtx = toAdminCtx(payload);

    try {
      authorize(adminCtx, 'user:view');
    } catch (e) {
      if (e instanceof AuthorizationError) return errorResponse(e.message, 403);
      throw e;
    }

    const { id } = await context.params;

    await connectDB();
    const user = await User.findById(id).select('-passwordHash -__v').lean();
    if (!user) return errorResponse('User not found', 404);

    // Scope check: can only see users at or below your rank within your jurisdiction
    if (adminCtx.role !== 'head_admin') {
      // Allow viewing own profile always
      if (user.email !== payload.email) {
        // Check hierarchical access
        if (!outranks(adminCtx.role, user.role as AdminRole) && adminCtx.role !== user.role) {
          return errorResponse('Access denied', 403);
        }
        // Department scope check
        if (adminCtx.departments.length > 0) {
          const overlap = (user.departments as string[]).some(
            d => adminCtx.departments.includes(d)
          );
          if (!overlap) {
            return errorResponse('User is outside your department scope', 403);
          }
        }
      }
    }

    return successResponse(user);
  } catch (err) {
    console.error('[ADMIN USER GET ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * PATCH /api/admin/users/[id] — Update an admin user (RBAC-controlled)
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const correlationId = uuidv4();
  const ip = getClientIp(req);

  try {
    const payload = await authenticateAdmin(req);
    if (!payload) return errorResponse('Authentication required', 401);

    const adminCtx = toAdminCtx(payload);

    try {
      authorize(adminCtx, 'user:update');
    } catch (e) {
      if (e instanceof AuthorizationError) return errorResponse(e.message, 403);
      throw e;
    }

    const { id } = await context.params;
    const body = await req.json();
    const parsed = updateAdminUserSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Validation failed', 400,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parsed.error.issues.map((e: any) => ({
          field: String(e.path.join('.')),
          message: e.message,
        }))
      );
    }

    await connectDB();
    const targetUser = await User.findById(id);
    if (!targetUser) return errorResponse('User not found', 404);

    // Prevent self-role-downgrade
    if (
      targetUser.email === payload.email &&
      parsed.data.role &&
      parsed.data.role !== payload.role
    ) {
      return errorResponse('Cannot change your own role', 403);
    }

    // Prevent self-deactivation
    if (targetUser.email === payload.email && parsed.data.isActive === false) {
      return errorResponse('Cannot deactivate your own account', 403);
    }

    // Hierarchy check: you can only edit users with lower or equal rank
    if (adminCtx.role !== 'head_admin' && targetUser.email !== payload.email) {
      if (!outranks(adminCtx.role, targetUser.role as AdminRole)) {
        return errorResponse('Cannot edit a user with equal or higher authority', 403);
      }
    }

    // If changing role, verify creator is allowed to assign the new role
    if (parsed.data.role && parsed.data.role !== targetUser.role) {
      if (!canCreateRole(adminCtx.role, parsed.data.role as AdminRole)) {
        return errorResponse('Cannot assign this role', 403);
      }
    }

    // Department scope check
    if (adminCtx.departments.length > 0 && targetUser.email !== payload.email) {
      const overlap = targetUser.departments.some(
        d => adminCtx.departments.includes(d)
      );
      if (!overlap) {
        return errorResponse('User is not within your department scope', 403);
      }
      // Cannot assign departments outside own scope
      if (parsed.data.departments) {
        const invalid = parsed.data.departments.filter(d => !adminCtx.departments.includes(d));
        if (invalid.length > 0) {
          return errorResponse('Cannot assign departments outside your scope', 403);
        }
      }
    }

    const resolvedRole = (parsed.data.role || targetUser.role) as AdminRole;
    const normalizedIncomingScope = parsed.data.locationScope === undefined
      ? undefined
      : (resolvedRole === 'head_admin'
          ? {}
          : {
              ...parsed.data.locationScope,
              country: 'India',
              state: 'Arunachal Pradesh',
            });

    // Location scope containment on edit
    if (parsed.data.locationScope) {
      const targetScopeCtx = { role: resolvedRole, departments: parsed.data.departments || targetUser.departments, locationScope: normalizedIncomingScope || {} };
      if (!scopeContains(adminCtx, targetScopeCtx)) {
        return errorResponse('Target location scope must be within your jurisdiction', 403);
      }
    }

    // Build changes record for audit
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    if (parsed.data.name && parsed.data.name !== targetUser.name) {
      changes.name = { from: targetUser.name, to: parsed.data.name };
      targetUser.name = parsed.data.name;
    }
    if (parsed.data.role && parsed.data.role !== targetUser.role) {
      changes.role = { from: targetUser.role, to: parsed.data.role };
      targetUser.role = parsed.data.role as AdminRole;
    }
    if (parsed.data.departments !== undefined) {
      changes.departments = { from: targetUser.departments, to: parsed.data.departments };
      targetUser.departments = parsed.data.departments;
    }
    if (normalizedIncomingScope !== undefined) {
      changes.locationScope = { from: targetUser.locationScope, to: normalizedIncomingScope };
      targetUser.locationScope = normalizedIncomingScope;
    }
    if (parsed.data.phone !== undefined && parsed.data.phone !== targetUser.phone) {
      changes.phone = { from: targetUser.phone, to: parsed.data.phone };
      targetUser.phone = parsed.data.phone;
    }

    // Handle activation/deactivation
    if (parsed.data.isActive !== undefined && parsed.data.isActive !== targetUser.isActive) {
      changes.isActive = { from: targetUser.isActive, to: parsed.data.isActive };
      targetUser.isActive = parsed.data.isActive;

      if (!parsed.data.isActive) {
        // Deactivating: set metadata and revoke all refresh tokens
        targetUser.deactivatedAt = new Date();
        targetUser.deactivatedBy = payload.email;
        await RefreshToken.deleteMany({ userEmail: targetUser.email });
      } else {
        // Reactivating: clear deactivation metadata
        targetUser.deactivatedAt = null;
        targetUser.deactivatedBy = null;
      }
    }

    if (Object.keys(changes).length === 0) {
      return errorResponse('No changes detected', 400);
    }

    await targetUser.save();

    // Audit log
    await createAuditEntry({
      action: parsed.data.isActive === false ? 'admin.deactivated' : 'admin.updated',
      actor: payload.email,
      targetType: 'user',
      targetId: targetUser._id.toString(),
      changes,
      metadata: { updatedBy: payload.email },
      correlationId,
      ipAddress: ip,
    });

    return successResponse(targetUser.toJSON());
  } catch (err) {
    console.error('[ADMIN USER UPDATE ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
