// ---------------------------------------------------------------------------
// Client-side RBAC helpers — safe to import in 'use client' components
// ---------------------------------------------------------------------------

/**
 * All admin roles in the system, ordered by authority level (highest → lowest).
 */
export const ADMIN_ROLES = [
  'head_admin',
  'chief_engineer',
  'superintending_engineer',
  'executive_engineer',
  'assistant_engineer',
  'junior_engineer',
  'field_technician',
  'helpdesk',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

// ---------------------------------------------------------------------------
// Role metadata — labels, levels, UI requirements
// ---------------------------------------------------------------------------
export interface RoleMeta {
  slug: AdminRole;
  label: string;
  shortLabel: string;
  level: number;
  requiresDepartment: boolean;
  departmentOptional: boolean;
  requiredLocationFields: ('country' | 'state' | 'district' | 'circle' | 'division' | 'subDivision' | 'section' | 'block' | 'area')[];
  badgeColor: string;         // Tailwind classes for badge
}

export const ROLE_META: Record<AdminRole, RoleMeta> = {
  head_admin: {
    slug: 'head_admin',
    label: 'Head Admin',
    shortLabel: 'Head Admin',
    level: 0,
    requiresDepartment: false,
    departmentOptional: false,
    requiredLocationFields: [],
    badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
  },
  chief_engineer: {
    slug: 'chief_engineer',
    label: 'Chief Engineer',
    shortLabel: 'Chief Engineer',
    level: 1,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: [],
    badgeColor: 'text-purple-700 bg-purple-50 border-purple-200',
  },
  superintending_engineer: {
    slug: 'superintending_engineer',
    label: 'Superintending Engineer',
    shortLabel: 'Superintending Engineer',
    level: 2,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['district', 'circle'],
    badgeColor: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  },
  executive_engineer: {
    slug: 'executive_engineer',
    label: 'Executive Engineer',
    shortLabel: 'Executive Engineer',
    level: 3,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['district', 'circle', 'division'],
    badgeColor: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  assistant_engineer: {
    slug: 'assistant_engineer',
    label: 'Assistant Engineer',
    shortLabel: 'Assistant Engineer',
    level: 4,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['district', 'circle', 'division', 'subDivision'],
    badgeColor: 'text-cyan-700 bg-cyan-50 border-cyan-200',
  },
  junior_engineer: {
    slug: 'junior_engineer',
    label: 'Junior Engineer',
    shortLabel: 'Junior Engineer',
    level: 5,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['district', 'circle', 'division', 'subDivision'],
    badgeColor: 'text-teal-700 bg-teal-50 border-teal-200',
  },
  field_technician: {
    slug: 'field_technician',
    label: 'Field Technician',
    shortLabel: 'Field Technician',
    level: 6,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['district', 'circle', 'division', 'subDivision'],
    badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  helpdesk: {
    slug: 'helpdesk',
    label: 'Helpdesk / Citizen Support',
    shortLabel: 'Helpdesk',
    level: 7,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['district'],
    badgeColor: 'text-slate-700 bg-slate-50 border-slate-200',
  },
};

// ---------------------------------------------------------------------------
// Role creation matrix — who can create whom
// ---------------------------------------------------------------------------
export const CREATION_MATRIX: Record<AdminRole, AdminRole[]> = {
  head_admin: ['head_admin', 'chief_engineer', 'superintending_engineer', 'executive_engineer', 'assistant_engineer', 'junior_engineer', 'field_technician', 'helpdesk'],
  chief_engineer: ['superintending_engineer', 'executive_engineer', 'assistant_engineer', 'junior_engineer', 'field_technician', 'helpdesk'],
  superintending_engineer: ['executive_engineer', 'assistant_engineer', 'junior_engineer', 'field_technician', 'helpdesk'],
  executive_engineer: ['assistant_engineer', 'junior_engineer', 'field_technician', 'helpdesk'],
  assistant_engineer: ['junior_engineer', 'field_technician', 'helpdesk'],
  junior_engineer: ['field_technician', 'helpdesk'],
  field_technician: [],
  helpdesk: [],
};

// ---------------------------------------------------------------------------
// Client-side permission map (simplified — for UI gating only, not security)
// ---------------------------------------------------------------------------
const SIDEBAR_PERMISSIONS: Record<string, number> = {
  // path → max role level that can see this item (0 = head_admin only)
  '/admin/dashboard': 7,
  '/admin/complaints': 7,
  '/admin/analytics': 4,
  '/admin/departments': 3,
  '/admin/settings': 3,
};

/**
 * Check if a role level can see a sidebar item.
 */
export function canSeeSidebarItem(roleLevel: number, path: string): boolean {
  const maxLevel = SIDEBAR_PERMISSIONS[path];
  if (maxLevel === undefined) return true;
  return roleLevel <= maxLevel;
}

/**
 * Get the hierarchy level of a role.
 */
export function getRoleLevel(role: string): number {
  return ROLE_META[role as AdminRole]?.level ?? 999;
}

/**
 * Check if a role can create users (has any entries in CREATION_MATRIX).
 */
export function canCreateUsers(role: string): boolean {
  const matrix = CREATION_MATRIX[role as AdminRole];
  return !!matrix && matrix.length > 0;
}

/**
 * Get the list of roles that the given role can create.
 */
export function getCreatableRoles(role: string): AdminRole[] {
  return CREATION_MATRIX[role as AdminRole] || [];
}

/**
 * Check if roleA outranks roleB.
 */
export function outranks(roleA: string, roleB: string): boolean {
  return getRoleLevel(roleA) < getRoleLevel(roleB);
}
