// ---------------------------------------------------------------------------
// Permission definitions & Role → Permission mapping
// ---------------------------------------------------------------------------
import type { AdminRole } from './roles';

/**
 * All permission IDs in the system.
 */
export const PERMISSIONS = [
  // Complaint actions
  'complaint:view',
  'complaint:update',
  'complaint:assign',
  'complaint:close',
  'complaint:reassign',
  'complaint:reveal-contact',
  'complaint:reanalyze',
  'complaint:bulk-update',

  // Call / outreach
  'call:initiate',

  // User management
  'user:create',
  'user:update',
  'user:delete',
  'user:view',

  // Department management
  'department:view',
  'department:create',
  'department:update',

  // Analytics & reporting
  'analytics:view',
  'analytics:export',

  // Map
  'map:view',

  // System
  'settings:view',
  'settings:update',
  'audit:view',
  'notification:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// ---------------------------------------------------------------------------
// Role → base permissions mapping
//
// These are the permissions a role inherently has, regardless of scope.
// Scope checks (location + department) are applied separately at runtime.
// ---------------------------------------------------------------------------
const ALL_PERMISSIONS: Permission[] = [...PERMISSIONS];

const STANDARD_COMPLAINT_OPS: Permission[] = [
  'complaint:view',
  'complaint:update',
  'complaint:assign',
  'complaint:close',
  'complaint:reassign',
  'complaint:reveal-contact',
  'complaint:reanalyze',
  'complaint:bulk-update',
  'call:initiate',
];

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  head_admin: ALL_PERMISSIONS,

  cabinet: [
    ...STANDARD_COMPLAINT_OPS,
    'user:create', 'user:update', 'user:view',
    'department:view', 'department:create', 'department:update',
    'analytics:view', 'analytics:export',
    'map:view',
    'settings:view',
    'audit:view',
    'notification:manage',
  ],

  state_chief: [
    ...STANDARD_COMPLAINT_OPS,
    'user:create', 'user:update', 'user:view',
    'department:view', 'department:update',
    'analytics:view', 'analytics:export',
    'map:view',
    'settings:view',
    'audit:view',
    'notification:manage',
  ],

  district_commissioner: [
    ...STANDARD_COMPLAINT_OPS,
    'user:create', 'user:update', 'user:view',
    'department:view',
    'analytics:view', 'analytics:export',
    'map:view',
    'settings:view',
    'audit:view',
    'notification:manage',
  ],

  department_director: [
    ...STANDARD_COMPLAINT_OPS,
    'user:create', 'user:update', 'user:view',
    'department:view', 'department:update',
    'analytics:view', 'analytics:export',
    'map:view',
    'settings:view',
    'audit:view',
    'notification:manage',
  ],

  department_head: [
    ...STANDARD_COMPLAINT_OPS,
    'user:create', 'user:update', 'user:view',
    'department:view', 'department:update',
    'analytics:view',
    'map:view',
    'settings:view',
    'audit:view',
    'notification:manage',
  ],

  senior_officer: [
    'complaint:view',
    'complaint:update',
    'complaint:assign',
    'complaint:close',
    'complaint:reassign',
    'complaint:reveal-contact',
    'complaint:reanalyze',
    'call:initiate',
    'user:create', 'user:view',
    'department:view',
    'analytics:view',
    'map:view',
    'notification:manage',
  ],

  officer: [
    'complaint:view',
    'complaint:update',
    'complaint:assign',
    'complaint:close',
    'complaint:reveal-contact',
    'call:initiate',
    'user:create', 'user:view',
    'department:view',
    'analytics:view',
    'map:view',
    'notification:manage',
  ],

  junior_officer: [
    'complaint:view',
    'complaint:update',
    'department:view',
    'map:view',
    'notification:manage',
  ],

  field_staff: [
    'complaint:view',
    'complaint:update', // progress updates only — enforced at route level
    'department:view',
    'map:view',
    'notification:manage',
  ],

  support_staff: [
    'complaint:view',
    'complaint:update', // limited — data entry only
    'department:view',
    'map:view',
    'notification:manage',
  ],
};

/**
 * Compute the effective permissions for an admin.
 * Returns a deduplicated array of permission strings.
 */
export function computeEffectivePermissions(role: AdminRole): Permission[] {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return [];
  return [...new Set(perms)];
}

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
