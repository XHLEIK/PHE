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

  chief_engineer: [
    ...STANDARD_COMPLAINT_OPS,
    'user:create', 'user:update', 'user:view',
    'department:view', 'department:create', 'department:update',
    'analytics:view', 'analytics:export',
    'map:view',
    'settings:view',
    'audit:view',
    'notification:manage',
  ],

  superintending_engineer: [
    ...STANDARD_COMPLAINT_OPS,
    'user:create', 'user:update', 'user:view',
    'department:view', 'department:update',
    'analytics:view', 'analytics:export',
    'map:view',
    'settings:view',
    'audit:view',
    'notification:manage',
  ],

  executive_engineer: [
    ...STANDARD_COMPLAINT_OPS,
    'user:create', 'user:update', 'user:view',
    'department:view',
    'analytics:view', 'analytics:export',
    'map:view',
    'settings:view',
    'audit:view',
    'notification:manage',
  ],

  assistant_engineer: [
    'complaint:view',
    'complaint:update',
    'complaint:assign',
    'complaint:reveal-contact',
    'call:initiate',
    'user:create', 'user:view',
    'department:view',
    'analytics:view',
    'map:view',
    'notification:manage',
  ],

  junior_engineer: [
    'complaint:view',
    'complaint:update',
    'complaint:assign',
    'complaint:reveal-contact',
    'department:view',
    'map:view',
    'notification:manage',
  ],

  field_technician: [
    'complaint:view',
    'complaint:update',
    'department:view',
    'map:view',
    'notification:manage',
  ],

  helpdesk: [
    'complaint:view',
    'complaint:update',
    'complaint:assign',
    'department:view',
    'notification:manage',
    'map:view',
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
