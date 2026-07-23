import type { ExternalIdentity, ParsedLdapUsername } from './types.js';

/**
 * Parse login identifiers of the form `DOMAIN\user` or `user@email.domain`.
 */
export function parseLdapUsername(input: string): ParsedLdapUsername {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) {
    return { username: '' };
  }

  const backslash = trimmed.indexOf('\\');
  if (backslash > 0) {
    return {
      username: trimmed.slice(backslash + 1).trim(),
      netbios: trimmed.slice(0, backslash).trim().toUpperCase(),
      raw: trimmed,
    };
  }

  const at = trimmed.lastIndexOf('@');
  if (at > 0 && at < trimmed.length - 1) {
    const local = trimmed.slice(0, at).trim();
    const emailDomain = trimmed.slice(at + 1).trim().toLowerCase();
    return {
      username: local,
      emailDomain,
      raw: trimmed,
    };
  }

  return { username: trimmed, raw: trimmed };
}

/**
 * Drop empty / invalid string ids (including the string `"null"` from
 * `String(null)` + `filter(Boolean)` bugs).
 */
export function sanitizeStringIds(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const out = new Set<string>();
  for (const id of values) {
    if (id == null) continue;
    const value = String(id).trim();
    if (!value || value === 'null' || value === 'undefined') continue;
    out.add(value);
  }
  return [...out];
}

/** Alias for role-id lists. */
export const sanitizeRoleIds = sanitizeStringIds;

/** Map LDAP group DNs/CNs to local role ids via an exact-key map. */
export function mapGroupsToRoleIds(
  groups: string[],
  groupRoleMap: Record<string, string> = {},
): string[] {
  const roles = new Set<string>();
  for (const group of groups) {
    const mapped = groupRoleMap[group];
    if (mapped) roles.add(String(mapped));
  }
  return sanitizeStringIds([...roles]);
}

/** Union existing role ids with roles derived from LDAP groups. */
export function mergeExternalRoles(
  existingRoleIds: string[] | undefined,
  mappedRoleIds: string[],
): string[] {
  return sanitizeStringIds([...(existingRoleIds ?? []), ...mappedRoleIds]);
}

/** Stable external subject key for upserts: `ldap:{domainId}:{subject}`. */
export function ldapExternalId(identity: Pick<ExternalIdentity, 'domainId' | 'subject'>): string {
  return `ldap:${identity.domainId}:${identity.subject}`;
}
