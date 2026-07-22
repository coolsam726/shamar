import {
  can,
  userHasPermission,
  type PolicyAbility,
  type PolicyClass,
  type QueryScope,
  type ShamarUser,
} from '@shamar/core';
import { ForbiddenError } from './errors.js';
import type { ResourceAction } from './types.js';

export type { PolicyAbility, PolicyClass, QueryScope };

/** Map internal resource actions to Loom policy abilities. */
export function toPolicyAbility(action: ResourceAction): PolicyAbility {
  return action === 'update' ? 'edit' : action;
}

/**
 * Filament / Loom policy base.
 * Default methods check RBAC permission strings; override for record rules.
 */
export abstract class Policy {
  static ownerField?: string;

  static viewAny(user: ShamarUser, slug = 'resource'): boolean {
    return userHasPermission(user, slug, 'viewAny');
  }

  static view(user: ShamarUser, _record: Record<string, unknown>, slug = 'resource'): boolean {
    return userHasPermission(user, slug, 'view');
  }

  static create(user: ShamarUser, slug = 'resource'): boolean {
    return userHasPermission(user, slug, 'create');
  }

  static edit(user: ShamarUser, _record: Record<string, unknown>, slug = 'resource'): boolean {
    return userHasPermission(user, slug, 'edit');
  }

  static delete(user: ShamarUser, _record: Record<string, unknown>, slug = 'resource'): boolean {
    return userHasPermission(user, slug, 'delete');
  }

  static scopeList(_user: ShamarUser, _slug?: string): QueryScope | undefined {
    return undefined;
  }
}

/** True when record[ownerField] matches the current user id. */
export function ownedBy(
  user: ShamarUser,
  record: Record<string, unknown>,
  ownerField = 'createdById',
): boolean {
  const owner = record[ownerField] ?? record.userId ?? record.createdBy;
  if (owner == null) return false;
  return String(owner) === String(user.id);
}

export function resolvePolicy(policy: PolicyClass | undefined, slug: string): PolicyClass {
  if (policy) return policy;

  return class DefaultPolicy extends Policy {
    static override viewAny(user: ShamarUser) {
      return userHasPermission(user, slug, 'viewAny');
    }
    static override view(user: ShamarUser, record: Record<string, unknown>) {
      return userHasPermission(user, slug, 'view');
    }
    static override create(user: ShamarUser) {
      return userHasPermission(user, slug, 'create');
    }
    static override edit(user: ShamarUser, record: Record<string, unknown>) {
      return userHasPermission(user, slug, 'edit');
    }
    static override delete(user: ShamarUser, record: Record<string, unknown>) {
      return userHasPermission(user, slug, 'delete');
    }
  };
}

export function scopeList(
  policy: PolicyClass | undefined,
  user: ShamarUser | null | undefined,
  slug: string,
): QueryScope | undefined {
  if (!user) return undefined;
  const resolved = resolvePolicy(policy, slug);
  return resolved.scopeList?.(user, slug);
}

/** True when record satisfies every `scope.equals` filter (or scope is empty). */
export function recordMatchesScope(
  record: Record<string, unknown>,
  scope: QueryScope | undefined,
): boolean {
  if (!scope?.equals) return true;
  for (const [key, expected] of Object.entries(scope.equals)) {
    const actual = record[key];
    if (actual == null && expected == null) continue;
    if (String(actual ?? '') !== String(expected ?? '')) return false;
  }
  return true;
}

/** Enforce list scope on a single record (IDOR guard). */
export function assertRecordInScope(
  policy: PolicyClass | undefined,
  user: ShamarUser,
  slug: string,
  record: Record<string, unknown>,
): void {
  const listScope = scopeList(policy, user, slug);
  if (!recordMatchesScope(record, listScope)) {
    throw new ForbiddenError(`You are not allowed to access this ${slug} record`);
  }
}

export function checkPolicy(
  policy: PolicyClass | undefined,
  ability: PolicyAbility,
  user: ShamarUser | null | undefined,
  slug: string,
  record?: Record<string, unknown>,
): boolean {
  if (!user) return false;
  const resolved = resolvePolicy(policy, slug);

  switch (ability) {
    case 'viewAny':
      return resolved.viewAny?.(user, slug) ?? userHasPermission(user, slug, ability);
    case 'create':
      return resolved.create?.(user, slug) ?? userHasPermission(user, slug, ability);
    case 'view':
      return (
        resolved.view?.(user, record ?? {}, slug) ?? userHasPermission(user, slug, ability)
      );
    case 'edit':
      return (
        resolved.edit?.(user, record ?? {}, slug) ?? userHasPermission(user, slug, ability)
      );
    case 'delete':
      return (
        resolved.delete?.(user, record ?? {}, slug) ?? userHasPermission(user, slug, ability)
      );
    default:
      return false;
  }
}

export function assertPolicy(
  policy: PolicyClass | undefined,
  ability: PolicyAbility,
  user: ShamarUser | null | undefined,
  slug: string,
  record?: Record<string, unknown>,
): void {
  if (!user) {
    throw new ForbiddenError('Authentication required');
  }

  if (!checkPolicy(policy, ability, user, slug, record)) {
    throw new ForbiddenError(`You are not allowed to ${ability} ${slug}`);
  }

  if (record && (ability === 'view' || ability === 'edit' || ability === 'delete')) {
    assertRecordInScope(policy, user, slug, record);
  }
}

export { can };
