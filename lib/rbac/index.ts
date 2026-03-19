// ---------------------------------------------------------------------------
// RBAC barrel export
// ---------------------------------------------------------------------------
export {
  ADMIN_ROLES,
  type AdminRole,
  ROLE_META,
  type RoleMeta,
  getRoleLevel,
  outranks,
  CREATION_MATRIX,
  canCreateRole,
  normalizeAdminRole,
} from './roles';

export {
  PERMISSIONS,
  type Permission,
  ROLE_PERMISSIONS,
  computeEffectivePermissions,
  hasPermission,
} from './permissions';

export {
  type LocationScope,
  type ScopedResource,
  type AdminScopeContext,
  isLocationInScope,
  isDepartmentInScope,
  isInScope,
  scopeContains,
  validateLocationForRole,
} from './scope';

export {
  authorize,
  toAdminCtx,
  buildScopeQuery,
  buildAdminScopeQuery,
  AuthorizationError,
} from './authorize';
