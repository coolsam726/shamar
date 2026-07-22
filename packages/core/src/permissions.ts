import type { ShamarUser } from './types.js';
import type { PolicyAbility } from './policy-types.js';
import { POLICY_ABILITIES } from './policy-types.js';
import type { ResourceRegistry } from './registry.js';

/** Build a permission key, e.g. `products:create`. */
export function permissionKey(resource: string, ability: string): string {
  return `${resource}:${ability}`;
}

/**
 * Check a full permission name (`companies:viewAny`, `companies:*`, `*`).
 * Wildcards: `*`, `{resource}:*`, `*:{ability}`.
 */
export function can(user: ShamarUser | null | undefined, permission: string): boolean {
  if (!user) return false;
  const permissions = user.permissions ?? [];
  if (permissions.includes('*') || permissions.includes(permission)) {
    return true;
  }
  const [resource, ability] = permission.split(':');
  if (!resource || !ability) return false;
  if (permissions.includes(`${resource}:*`)) return true;
  if (ability !== '*' && permissions.includes(`*:${ability}`)) return true;
  return false;
}

export function isAdmin(user: ShamarUser | null | undefined): boolean {
  if (!user) return false;
  if (can(user, '*')) return true;
  return Boolean(user.roleIds?.includes('admin') || user.roles?.includes('admin'));
}

export function userHasPermission(
  user: ShamarUser | null | undefined,
  slug: string,
  ability: PolicyAbility,
): boolean {
  if (!user) return false;
  return (
    can(user, '*') ||
    can(user, `${slug}:*`) ||
    can(user, `${slug}:${ability}`) ||
    can(user, `*:${ability}`)
  );
}

/** True if the user has any of the named permissions (wildcard-aware). */
export function canAny(user: ShamarUser | null | undefined, permissions: string[]): boolean {
  return permissions.some((entry) => can(user, entry));
}

export function hasExplicitPermissions(permissions?: string[] | null): boolean {
  return Array.isArray(permissions) && permissions.length > 0;
}

/** Wildcard grant covers a more specific permission candidate. */
export function covers(wildcard: string, candidate: string): boolean {
  if (!wildcard || !candidate || wildcard === candidate) return false;
  if (wildcard === '*') return true;
  if (wildcard.endsWith(':*')) {
    const prefix = wildcard.slice(0, -1);
    return candidate.startsWith(prefix);
  }
  if (wildcard.startsWith('*:')) {
    const suffix = wildcard.slice(2);
    return candidate.endsWith(`:${suffix}`);
  }
  return false;
}

/**
 * Whether a granted permission covers a required ability.
 */
export function matchesPermission(granted: Iterable<string>, required: string): boolean {
  const grants = [...granted];
  if (grants.length === 0) return false;
  if (grants.includes('*')) return true;
  if (grants.includes(required)) return true;

  for (const grant of grants) {
    if (covers(grant, required)) return true;
  }

  return false;
}

/**
 * Normalize resource `permissions()` entries into full `{slug}:{ability}` names.
 */
export function normalizeCustomPermissions(
  slug: string,
  entries: Array<string | { name: string; label?: string }>,
): Array<{ name: string; label?: string }> {
  const out: Array<{ name: string; label?: string }> = [];
  for (const entry of entries) {
    const raw = typeof entry === 'string' ? entry : entry.name;
    const label = typeof entry === 'string' ? undefined : entry.label;
    if (!raw?.trim()) continue;
    const name =
      raw === '*' || raw.includes(':') ? raw.trim() : `${slug}:${raw.trim()}`;
    out.push(label ? { name, label } : { name });
  }
  return out;
}

export interface PermissionCatalogEntry {
  name: string;
  resource: string;
  ability: string;
  label: string;
}

function humanizePolicyAbility(ability: string): string {
  if (ability === '*') return 'All';
  if (ability === 'viewAny') return 'View any';
  if (ability === 'view') return 'View';
  if (ability === 'create') return 'Create';
  if (ability === 'edit') return 'Update';
  if (ability === 'delete') return 'Delete';
  return ability.charAt(0).toUpperCase() + ability.slice(1);
}

/**
 * Build the full permission catalog from registered resources.
 * Upsert these rows on app boot — never create permissions manually in admin.
 */
export function buildPermissionCatalog(registry: ResourceRegistry): PermissionCatalogEntry[] {
  const entries: PermissionCatalogEntry[] = [
    {
      name: '*',
      resource: '*',
      ability: '*',
      label: 'Superuser (all)',
    },
  ];

  for (const meta of registry.all()) {
    for (const ability of POLICY_ABILITIES) {
      const name = permissionKey(meta.slug, ability);
      entries.push({
        name,
        resource: meta.slug,
        ability,
        label: `${meta.label} — ${humanizePolicyAbility(ability)}`,
      });
    }

    entries.push({
      name: permissionKey(meta.slug, '*'),
      resource: meta.slug,
      ability: '*',
      label: `${meta.label} — All`,
    });

    for (const custom of meta.customPermissions ?? []) {
      const colon = custom.name.indexOf(':');
      entries.push({
        name: custom.name,
        resource: colon > 0 ? custom.name.slice(0, colon) : meta.slug,
        ability: colon > 0 ? custom.name.slice(colon + 1) : custom.name,
        label: custom.label ?? custom.name,
      });
    }
  }

  return entries;
}
