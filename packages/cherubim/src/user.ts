import type { ShamarUser } from '@shamar/core';
import { sanitizeRoleIds } from './identity.js';
import type { CherubimUser, RoleResolver } from './types.js';

/** Normalize any user-like object into a Cherubim principal. */
export function toCherubimUser(
  input: Partial<ShamarUser> & {
    id: string;
    authProvider?: string;
    ldapDomainId?: string;
    apiKeyId?: string;
    apiKeyAbilities?: string[];
  },
  options?: { permissions?: string[]; roleIds?: string[] },
): CherubimUser {
  const name =
    input.name?.trim() ||
    (typeof input.email === 'string' ? input.email.split('@')[0] : '') ||
    String(input.id);

  return {
    id: String(input.id),
    name,
    email: input.email,
    permissions: options?.permissions ?? input.permissions ?? [],
    roleIds: sanitizeRoleIds(options?.roleIds ?? input.roleIds ?? []),
    authProvider: input.authProvider,
    ldapDomainId: input.ldapDomainId,
    apiKeyId: input.apiKeyId,
    apiKeyAbilities: input.apiKeyAbilities,
  };
}

/**
 * Merge role permissions into a user copy.
 * Direct `user.permissions` always win (union).
 */
export async function resolveUserPermissions(
  user: CherubimUser,
  resolver?: RoleResolver,
): Promise<CherubimUser> {
  if (!resolver || !user.roleIds?.length) return user;

  const fromRoles = await resolver.resolveRolePermissions(user.roleIds);
  const merged = new Set<string>([...(user.permissions ?? []), ...fromRoles]);

  return {
    ...user,
    permissions: [...merged],
  };
}
