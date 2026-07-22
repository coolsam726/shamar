import { permissionKey } from '@shamar/core';

/** Map resource CRUD actions to permission suffixes (`update` → `edit`). */
export function resourcePermissionKey(
  slug: string,
  action: 'viewAny' | 'view' | 'create' | 'update' | 'delete',
): string {
  const ability = action === 'update' ? 'edit' : action;
  return permissionKey(slug, ability);
}

// Re-export core permission helpers (Loom-compatible).
export {
  can,
  canAny,
  covers,
  hasExplicitPermissions,
  isAdmin,
  matchesPermission,
  normalizeCustomPermissions,
  permissionKey,
  userHasPermission,
} from '@shamar/core';
