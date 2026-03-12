// ---------------------------------------------------------------------------
// National Role Hierarchy — Canonical role definitions
// ---------------------------------------------------------------------------

/**
 * All admin roles in the system, ordered by authority level (highest → lowest).
 * The numeric `level` is used for hierarchy comparisons:
 *   - A user can only create/manage roles with a HIGHER level number (= lower authority).
 *   - Head Admin (level 0) can manage everyone.
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
// Role metadata — human labels, hierarchy level, scope requirements
// ---------------------------------------------------------------------------
export interface RoleMeta {
  slug: AdminRole;
  label: string;
  level: number;              // 0 = highest authority
  requiresDepartment: boolean;
  departmentOptional: boolean; // true only for support_staff
  requiredLocationFields: ('country' | 'state' | 'district' | 'block' | 'area')[];
}

export const ROLE_META: Record<AdminRole, RoleMeta> = {
  head_admin: {
    slug: 'head_admin',
    label: 'Head Admin / National Authority',
    level: 0,
    requiresDepartment: false,
    departmentOptional: false,
    requiredLocationFields: [],
  },
  cabinet: {
    slug: 'cabinet',
    label: 'Cabinet / Executive Authority',
    level: 1,
    requiresDepartment: false,
    departmentOptional: false,
    requiredLocationFields: ['country'],
  },
  state_chief: {
    slug: 'state_chief',
    label: 'State Chief Administrator',
    level: 2,
    requiresDepartment: false,
    departmentOptional: false,
    requiredLocationFields: ['country', 'state'],
  },
  district_commissioner: {
    slug: 'district_commissioner',
    label: 'District Commissioner / Collector',
    level: 3,
    requiresDepartment: false,
    departmentOptional: false,
    requiredLocationFields: ['country', 'state', 'district'],
  },
  department_director: {
    slug: 'department_director',
    label: 'Department Director',
    level: 4,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['country', 'state'],
  },
  department_head: {
    slug: 'department_head',
    label: 'Department Head',
    level: 5,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['country', 'state', 'district'],
  },
  senior_officer: {
    slug: 'senior_officer',
    label: 'Senior Officer',
    level: 6,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['country', 'state', 'district', 'block'],
  },
  officer: {
    slug: 'officer',
    label: 'Officer',
    level: 7,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['country', 'state', 'district', 'block'],
  },
  junior_officer: {
    slug: 'junior_officer',
    label: 'Junior Officer',
    level: 8,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['country', 'state', 'district', 'block', 'area'],
  },
  field_staff: {
    slug: 'field_staff',
    label: 'Field Staff',
    level: 9,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['country', 'state', 'district', 'block', 'area'],
  },
  support_staff: {
    slug: 'support_staff',
    label: 'Support Staff',
    level: 10,
    requiresDepartment: false,
    departmentOptional: true,
    requiredLocationFields: ['country', 'state', 'district'],
  },
};

/**
 * Get the hierarchy level of a role (0 = highest).
 */
export function getRoleLevel(role: AdminRole): number {
  return ROLE_META[role]?.level ?? 999;
}

/**
 * Check if roleA outranks roleB (lower level number = higher authority).
 */
export function outranks(roleA: AdminRole, roleB: AdminRole): boolean {
  return getRoleLevel(roleA) < getRoleLevel(roleB);
}

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

/**
 * Check if a creator role is allowed to create a target role.
 */
export function canCreateRole(creatorRole: AdminRole, targetRole: AdminRole): boolean {
  return CREATION_MATRIX[creatorRole]?.includes(targetRole) ?? false;
}
