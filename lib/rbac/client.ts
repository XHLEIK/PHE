// ---------------------------------------------------------------------------
// Client-side RBAC helpers — safe to import in 'use client' components
// ---------------------------------------------------------------------------

/**
 * All admin roles in the system, ordered by authority level (highest → lowest).
 */
export const ADMIN_ROLES = [
  'head_admin',
  'cabinet',
  'state_chief',
  'district_commissioner',
  'department_director',
  'department_head',
  'senior_officer',
  'officer',
  'junior_officer',
  'field_staff',
  'support_staff',
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
  requiredLocationFields: ('country' | 'state' | 'district' | 'block' | 'area')[];
  badgeColor: string;         // Tailwind classes for badge
}

export const ROLE_META: Record<AdminRole, RoleMeta> = {
  head_admin: {
    slug: 'head_admin',
    label: 'Head Admin / National Authority',
    shortLabel: 'Head Admin',
    level: 0,
    requiresDepartment: false,
    departmentOptional: false,
    requiredLocationFields: [],
    badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
  },
  cabinet: {
    slug: 'cabinet',
    label: 'Cabinet / Executive Authority',
    shortLabel: 'Cabinet',
    level: 1,
    requiresDepartment: false,
    departmentOptional: false,
    requiredLocationFields: ['country'],
    badgeColor: 'text-purple-700 bg-purple-50 border-purple-200',
  },
  state_chief: {
    slug: 'state_chief',
    label: 'State Chief Administrator',
    shortLabel: 'State Chief',
    level: 2,
    requiresDepartment: false,
    departmentOptional: false,
    requiredLocationFields: ['country', 'state'],
    badgeColor: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  },
  district_commissioner: {
    slug: 'district_commissioner',
    label: 'District Commissioner / Collector',
    shortLabel: 'District Commissioner',
    level: 3,
    requiresDepartment: false,
    departmentOptional: false,
    requiredLocationFields: ['country', 'state', 'district'],
    badgeColor: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  department_director: {
    slug: 'department_director',
    label: 'Department Director',
    shortLabel: 'Dept. Director',
    level: 4,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['country', 'state'],
    badgeColor: 'text-cyan-700 bg-cyan-50 border-cyan-200',
  },
  department_head: {
    slug: 'department_head',
    label: 'Department Head',
    shortLabel: 'Dept. Head',
    level: 5,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['country', 'state', 'district'],
    badgeColor: 'text-teal-700 bg-teal-50 border-teal-200',
  },
  senior_officer: {
    slug: 'senior_officer',
    label: 'Senior Officer',
    shortLabel: 'Sr. Officer',
    level: 6,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['country', 'state', 'district', 'block'],
    badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  officer: {
    slug: 'officer',
    label: 'Officer',
    shortLabel: 'Officer',
    level: 7,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['country', 'state', 'district', 'block'],
    badgeColor: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  junior_officer: {
    slug: 'junior_officer',
    label: 'Junior Officer',
    shortLabel: 'Jr. Officer',
    level: 8,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['country', 'state', 'district', 'block', 'area'],
    badgeColor: 'text-orange-700 bg-orange-50 border-orange-200',
  },
  field_staff: {
    slug: 'field_staff',
    label: 'Field Staff',
    shortLabel: 'Field Staff',
    level: 9,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['country', 'state', 'district', 'block', 'area'],
    badgeColor: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  },
  support_staff: {
    slug: 'support_staff',
    label: 'Support Staff',
    shortLabel: 'Support',
    level: 10,
    requiresDepartment: false,
    departmentOptional: true,
    requiredLocationFields: ['country', 'state', 'district'],
    badgeColor: 'text-slate-700 bg-slate-50 border-slate-200',
  },
};

// ---------------------------------------------------------------------------
// Role creation matrix — who can create whom
// ---------------------------------------------------------------------------
export const CREATION_MATRIX: Record<AdminRole, AdminRole[]> = {
  head_admin:              ['head_admin', 'cabinet', 'state_chief', 'district_commissioner', 'department_director', 'department_head', 'senior_officer', 'officer', 'junior_officer', 'field_staff', 'support_staff'],
  cabinet:                 ['state_chief', 'district_commissioner', 'department_director'],
  state_chief:             ['district_commissioner', 'department_director', 'department_head', 'senior_officer', 'officer', 'junior_officer', 'field_staff', 'support_staff'],
  district_commissioner:   ['department_head', 'senior_officer', 'officer', 'junior_officer', 'field_staff', 'support_staff'],
  department_director:     ['department_head', 'senior_officer', 'officer', 'junior_officer', 'field_staff', 'support_staff'],
  department_head:         ['senior_officer', 'officer', 'junior_officer', 'field_staff', 'support_staff'],
  senior_officer:          ['officer', 'junior_officer', 'field_staff'],
  officer:                 ['junior_officer', 'field_staff'],
  junior_officer:          [],
  field_staff:             [],
  support_staff:           [],
};

// ---------------------------------------------------------------------------
// Client-side permission map (simplified — for UI gating only, not security)
// ---------------------------------------------------------------------------
const SIDEBAR_PERMISSIONS: Record<string, number> = {
  // path → max role level that can see this item (0 = head_admin only, 10 = everyone)
  '/admin/dashboard': 10,
  '/admin/complaints': 10,
  '/admin/analytics': 5,   // up to department_head
  '/admin/departments': 3,  // up to district_commissioner
  '/admin/settings': 5,     // up to department_head (user management)
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
