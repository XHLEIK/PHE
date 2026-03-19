// ---------------------------------------------------------------------------
// PHE & Water Supply Role Hierarchy — Canonical role definitions
// ---------------------------------------------------------------------------

/**
 * All admin roles in the system, ordered by authority level (highest → lowest).
 * The numeric `level` is used for hierarchy comparisons:
 *   - A user can only create/manage roles with a HIGHER level number (= lower authority).
 *   - Head Admin (level 0) can manage everyone.
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
// Role metadata — human labels, hierarchy level, scope requirements
// ---------------------------------------------------------------------------
export interface RoleMeta {
  slug: AdminRole;
  label: string;
  level: number;              // 0 = highest authority
  requiresDepartment: boolean;
  departmentOptional: boolean;
  requiredLocationFields: ('country' | 'state' | 'district' | 'circle' | 'division' | 'subDivision' | 'section' | 'block' | 'area')[];
}

export const ROLE_META: Record<AdminRole, RoleMeta> = {
  head_admin: {
    slug: 'head_admin',
    label: 'Head Admin',
    level: 0,
    requiresDepartment: false,
    departmentOptional: false,
    requiredLocationFields: [],
  },
  chief_engineer: {
    slug: 'chief_engineer',
    label: 'Chief Engineer',
    level: 1,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: [],
  },
  superintending_engineer: {
    slug: 'superintending_engineer',
    label: 'Superintending Engineer',
    level: 2,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['district', 'circle'],
  },
  executive_engineer: {
    slug: 'executive_engineer',
    label: 'Executive Engineer',
    level: 3,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['district', 'circle', 'division'],
  },
  assistant_engineer: {
    slug: 'assistant_engineer',
    label: 'Assistant Engineer',
    level: 4,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['district', 'circle', 'division', 'subDivision'],
  },
  junior_engineer: {
    slug: 'junior_engineer',
    label: 'Junior Engineer',
    level: 5,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['district', 'circle', 'division', 'subDivision'],
  },
  field_technician: {
    slug: 'field_technician',
    label: 'Field Technician',
    level: 6,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['district', 'circle', 'division', 'subDivision'],
  },
  helpdesk: {
    slug: 'helpdesk',
    label: 'Helpdesk / Citizen Support',
    level: 7,
    requiresDepartment: true,
    departmentOptional: false,
    requiredLocationFields: ['district'],
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
  head_admin: ['head_admin', 'chief_engineer', 'superintending_engineer', 'executive_engineer', 'assistant_engineer', 'junior_engineer', 'field_technician', 'helpdesk'],
  chief_engineer: ['superintending_engineer', 'executive_engineer', 'assistant_engineer', 'junior_engineer', 'field_technician', 'helpdesk'],
  superintending_engineer: ['executive_engineer', 'assistant_engineer', 'junior_engineer', 'field_technician', 'helpdesk'],
  executive_engineer: ['assistant_engineer', 'junior_engineer', 'field_technician', 'helpdesk'],
  assistant_engineer: ['junior_engineer', 'field_technician', 'helpdesk'],
  junior_engineer: ['field_technician', 'helpdesk'],
  field_technician: [],
  helpdesk: [],
};

/**
 * Check if a creator role is allowed to create a target role.
 */
export function canCreateRole(creatorRole: AdminRole, targetRole: AdminRole): boolean {
  return CREATION_MATRIX[creatorRole]?.includes(targetRole) ?? false;
}

/**
 * Normalize legacy or unknown role strings into current role taxonomy.
 */
export function normalizeAdminRole(role: string): AdminRole {
  const normalized = role?.trim().toLowerCase() || '';
  const mapped: Record<string, AdminRole> = {
    head_admin: 'head_admin',
    chief_engineer: 'chief_engineer',
    superintending_engineer: 'superintending_engineer',
    executive_engineer: 'executive_engineer',
    assistant_engineer: 'assistant_engineer',
    junior_engineer: 'junior_engineer',
    field_technician: 'field_technician',
    helpdesk: 'helpdesk',
    citizen_support: 'helpdesk',
    senior_officer: 'executive_engineer',
    officer: 'assistant_engineer',
    junior_officer: 'junior_engineer',
    cabinet: 'chief_engineer',
    state_chief: 'chief_engineer',
    district_commissioner: 'superintending_engineer',
    department_director: 'executive_engineer',
    department_head: 'executive_engineer',
    support_staff: 'field_technician',
    field_staff: 'assistant_engineer',
  };

  return mapped[normalized] ?? 'helpdesk';
}
