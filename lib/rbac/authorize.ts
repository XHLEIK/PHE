// ---------------------------------------------------------------------------
// Authorization — the main authorize() function and query builder
// ---------------------------------------------------------------------------
import type { AdminRole } from './roles';
import type { Permission } from './permissions';
import type { LocationScope, ScopedResource, AdminScopeContext } from './scope';
import { hasPermission } from './permissions';
import { isInScope } from './scope';
import { normalizeAdminRole } from './roles';
import type { TokenPayload } from '@/lib/auth';

export { type AdminScopeContext } from './scope';

/**
 * Extract an AdminScopeContext from a JWT TokenPayload.
 * Convenience helper used at the top of every admin API route.
 */
export function toAdminCtx(payload: TokenPayload): AdminScopeContext {
  return {
    role: normalizeAdminRole(String(payload.role || '')),
    departments: payload.departments ?? [],
    locationScope: payload.locationScope ?? {},
  };
}

/**
 * Authorize an admin action against a specific resource.
 *
 * @param admin   - The admin's scope context (role + departments + location)
 * @param action  - The permission being requested (e.g., 'complaint:view')
 * @param resource - The target resource with location + department info
 * @returns `true` if authorized
 * @throws `AuthorizationError` if denied
 */
export function authorize(
  admin: AdminScopeContext,
  action: Permission,
  resource?: ScopedResource
): true {
  // Head admin bypasses all checks
  if (admin.role === 'head_admin') return true;

  // 1. Check base permission
  if (!hasPermission(admin.role, action)) {
    throw new AuthorizationError(
      `Role '${admin.role}' does not have permission '${action}'`,
      admin.role,
      action
    );
  }

  // 2. Check scope if resource is provided
  if (resource && !isInScope(admin, resource)) {
    throw new AuthorizationError(
      `Resource is outside your jurisdiction`,
      admin.role,
      action
    );
  }

  return true;
}

/**
 * Build a MongoDB query filter that enforces the admin's scope.
 *
 * This filter should be appended to every DB query for complaints/resources
 * so that the database only returns records within the admin's jurisdiction.
 *
 * @param admin - The admin's scope context
 * @returns A MongoDB filter object to spread into .find() / .countDocuments()
 */
export function buildScopeQuery(admin: AdminScopeContext): Record<string, unknown> {
  // Head admin sees everything
  if (admin.role === 'head_admin') return {};

  const filter: Record<string, unknown> = {};

  // Department constraints
  if (admin.departments.length > 0) {
    filter.department = { $in: admin.departments };
  } else {
    // non-head admins must be department-scoped
    filter.department = { $in: ['__NO_DEPARTMENT_ACCESS__'] };
  }

  // Field staff can only see complaints assigned to them — handled at route level
  // (the assignedTo filter is added in the route, not here, because we need the user's email)

  return filter;
}

/**
 * Build scope query for admin user management.
 * Restricts which admin users are visible based on creator's scope.
 */
export function buildAdminScopeQuery(admin: AdminScopeContext): Record<string, unknown> {
  if (admin.role === 'head_admin') return {};

  const filter: Record<string, unknown> = {};

  const loc = admin.locationScope;
  if (loc.state) filter['locationScope.state'] = loc.state;
  if (loc.district) filter['locationScope.district'] = loc.district;

  // Department-scoped admins can only see users in their departments
  if (admin.departments.length > 0) {
    filter.departments = { $in: admin.departments };
  } else {
    filter.departments = { $in: ['__NO_DEPARTMENT_ACCESS__'] };
  }

  return filter;
}

// ---------------------------------------------------------------------------
// Authorization error
// ---------------------------------------------------------------------------
export class AuthorizationError extends Error {
  public readonly statusCode = 403;
  public readonly role: AdminRole;
  public readonly action: string;

  constructor(message: string, role: AdminRole, action: string) {
    super(message);
    this.name = 'AuthorizationError';
    this.role = role;
    this.action = action;
  }
}
