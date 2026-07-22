import type { PolicyClass, Resource, ShamarUser } from '@shamar/core';
import { assertRecordInScope, checkPolicy, toPolicyAbility } from './policy.js';
import type { PolicyRegistry } from './policy-registry.js';
import type { ResourceAction } from './types.js';

type ResourceWithOptionalView = typeof Resource & {
  canView?: (user: ShamarUser, record?: Record<string, unknown>) => boolean;
};

/**
 * Evaluate authorization for a resource action via `Resource.can*` hooks
 * (which delegate to `Resource.policy` and RBAC permissions) plus list scope.
 */
export function authorizeResourceAction(
  ResourceClass: typeof Resource,
  action: ResourceAction,
  user: ShamarUser,
  record?: Record<string, unknown>,
  policies?: PolicyRegistry,
): boolean {
  const slug = ResourceClass.slug;
  const policy = policies?.resolve(slug, ResourceClass) ?? ResourceClass.policy;

  let allowed = false;
  switch (action) {
    case 'viewAny':
      allowed = ResourceClass.canViewAny(user);
      break;
    case 'view': {
      const rc = ResourceClass as ResourceWithOptionalView;
      allowed =
        typeof rc.canView === 'function'
          ? rc.canView(user, record)
          : ResourceClass.canView(user, record);
      break;
    }
    case 'create':
      allowed = ResourceClass.canCreate(user);
      break;
    case 'update':
      allowed = ResourceClass.canEdit(user, record);
      break;
    case 'delete':
      allowed = ResourceClass.canDelete(user, record);
      break;
    default:
      allowed = false;
  }

  if (!allowed) return false;

  if (record && (action === 'view' || action === 'update' || action === 'delete')) {
    try {
      assertRecordInScope(policy, user, slug, record);
    } catch {
      return false;
    }
  }

  return true;
}

export function authorizePolicyAction(
  PolicyClass: PolicyClass,
  action: ResourceAction,
  user: ShamarUser,
  slug: string,
  record?: Record<string, unknown>,
): boolean {
  return checkPolicy(PolicyClass, toPolicyAbility(action), user, slug, record);
}

export {
  Policy,
  assertPolicy,
  checkPolicy,
  ownedBy,
  resolvePolicy,
  scopeList,
  toPolicyAbility,
} from './policy.js';
export type { PolicyAbility } from './policy.js';
