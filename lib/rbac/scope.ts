// ---------------------------------------------------------------------------
// Location scope types and comparison utilities
// ---------------------------------------------------------------------------
import type { AdminRole } from './roles';
import { ROLE_META } from './roles';

/**
 * Location scope fields — hierarchical from broadest to narrowest.
 */
export interface LocationScope {
  country?: string;
  state?: string;
  district?: string;
  block?: string;
  area?: string;
}

/**
 * A resource with location + department info (complaint, user, etc.)
 */
export interface ScopedResource {
  department?: string | null;
  state?: string | null;
  district?: string | null;
  block?: string | null;
  area?: string | null;
}

/**
 * Admin scope context — everything needed for authorization.
 */
export interface AdminScopeContext {
  role: AdminRole;
  departments: string[];
  locationScope: LocationScope;
}

// Ordered location fields from broadest to narrowest
const LOCATION_FIELDS: (keyof LocationScope)[] = ['country', 'state', 'district', 'block', 'area'];

/**
 * Check if an admin's location scope covers a resource's location.
 *
 * Rule: for every non-empty field in admin.locationScope, the resource's
 * corresponding field must match. If the admin has no value for a field,
 * they can access any value at that level and below.
 *
 * Example:
 *   admin.locationScope = { state: "AR", district: "PAP" }
 *   resource = { state: "AR", district: "PAP", area: "Ganga" }
 *   → true (admin covers all areas within PAP)
 *
 *   resource = { state: "AR", district: "WEST_KAMENG" }
 *   → false (different district)
 */
export function isLocationInScope(
  adminScope: LocationScope,
  resource: ScopedResource
): boolean {
  for (const field of LOCATION_FIELDS) {
    if (field === 'country') continue; // country is always 'IN', skip
    const adminValue = adminScope[field];
    if (!adminValue) continue; // admin has no constraint at this level → covers all
    const resourceValue = resource[field as keyof ScopedResource] as string | undefined | null;
    if (!resourceValue) continue; // resource doesn't have this field → no conflict
    if (adminValue.toLowerCase() !== resourceValue.toLowerCase()) {
      return false;
    }
  }
  return true;
}

/**
 * Check if an admin's department scope covers a resource's department.
 *
 * Rules:
 * - Head Admin: always true (no department restriction).
 * - Roles without department requirement (cabinet, state_chief, district_commissioner):
 *   if departments[] is empty → can access all departments.
 *   if departments[] is non-empty → limited to those.
 * - Roles requiring department: must have the resource's department in their list.
 * - Support staff with empty departments: can access all departments (support actions only).
 */
export function isDepartmentInScope(
  admin: AdminScopeContext,
  resourceDepartment: string | null | undefined
): boolean {
  if (admin.role === 'head_admin') return true;

  // If resource has no department, it's accessible to all
  if (!resourceDepartment) return true;

  const meta = ROLE_META[admin.role];

  // Roles without department requirement with empty departments[] → all departments
  if (!meta.requiresDepartment && admin.departments.length === 0) return true;

  // Support staff with optional department and empty list → all departments
  if (meta.departmentOptional && admin.departments.length === 0) return true;

  // Otherwise, resource department must be in admin's departments list
  return admin.departments.some(
    d => d.toLowerCase() === resourceDepartment.toLowerCase()
  );
}

/**
 * Full scope check: location + department.
 */
export function isInScope(
  admin: AdminScopeContext,
  resource: ScopedResource
): boolean {
  if (admin.role === 'head_admin') return true;
  return isLocationInScope(admin.locationScope, resource) &&
         isDepartmentInScope(admin, resource.department);
}

/**
 * Check if an admin's scope fully contains another admin's scope.
 * Used for creation/management: you can only create/manage users
 * whose scope is equal to or narrower than yours.
 */
export function scopeContains(
  creator: AdminScopeContext,
  target: AdminScopeContext
): boolean {
  if (creator.role === 'head_admin') return true;

  // Location: creator's defined fields must all match in target
  for (const field of LOCATION_FIELDS) {
    if (field === 'country') continue;
    const creatorValue = creator.locationScope[field];
    if (!creatorValue) continue; // creator has no constraint → ok
    const targetValue = target.locationScope[field];
    if (!targetValue) return false; // target is broader (no constraint where creator has one)
    if (creatorValue.toLowerCase() !== targetValue.toLowerCase()) return false;
  }

  // Department: if creator is department-scoped, target must be within those departments
  if (creator.departments.length > 0 && target.departments.length > 0) {
    const creatorDepts = new Set(creator.departments.map(d => d.toLowerCase()));
    for (const dept of target.departments) {
      if (!creatorDepts.has(dept.toLowerCase())) return false;
    }
  } else if (creator.departments.length > 0 && target.departments.length === 0) {
    // Creator is dept-scoped but target has no dept restriction → target is broader
    const targetMeta = ROLE_META[target.role];
    if (targetMeta.requiresDepartment) return false; // target needs dept but has none → invalid anyway
    // Non-dept roles like state_chief with no departments are OK if location matches
  }

  return true;
}

/**
 * Validate that a location scope has all required fields for a given role.
 */
export function validateLocationForRole(
  role: AdminRole,
  locationScope: LocationScope
): { valid: boolean; missing: string[] } {
  const meta = ROLE_META[role];
  const missing: string[] = [];
  for (const field of meta.requiredLocationFields) {
    if (!locationScope[field]) {
      missing.push(field);
    }
  }
  return { valid: missing.length === 0, missing };
}
