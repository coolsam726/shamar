import type { FieldConfig, RelationConfig, ResourceMeta } from './types.js';

/**
 * Read a value from a record using dot notation.
 * `company.name` → `record.company.name`
 * `categories.name` → maps `name` across `record.categories[]`
 */
export function getRecordValue(
  record: Record<string, unknown>,
  path: string,
): unknown {
  if (!path.includes('.')) {
    return record[path];
  }

  const parts = path.split('.').filter(Boolean);
  if (parts.length === 0) return undefined;

  let current: unknown = record;
  for (const part of parts) {
    if (current == null) return undefined;

    if (Array.isArray(current)) {
      const mapped = current
        .map((item) => {
          if (item == null) return undefined;
          if (typeof item === 'object') {
            return (item as Record<string, unknown>)[part];
          }
          return part === 'value' || part === 'id' ? item : undefined;
        })
        .filter((value) => value != null && value !== '');
      return mapped.length > 0 ? mapped : undefined;
    }

    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/** Singularize a resource slug for path matching (`companies` → `company`). */
export function singularizeResourceSlug(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed) return trimmed;
  if (trimmed.endsWith('ies') && trimmed.length > 3) {
    return `${trimmed.slice(0, -3)}y`;
  }
  if (trimmed.endsWith('s') && trimmed.length > 1) {
    return trimmed.slice(0, -1);
  }
  return trimmed;
}

export interface RelationDisplayBinding {
  /** Full dot path, e.g. `company.name`. */
  path: string;
  /** First segment, e.g. `company` — nested key on the hydrated record. */
  root: string;
  /** Remaining segments joined, e.g. `name`. */
  attribute: string;
  /** Form FK / M2M field on the parent record, e.g. `companyId`. */
  fieldName: string;
  relation: RelationConfig;
}

/** Collect column/entry names that use dot notation. */
export function collectDisplayPaths(meta: ResourceMeta): string[] {
  const names = new Set<string>();
  for (const column of meta.columns) {
    if (column.name.includes('.')) names.add(column.name);
  }
  for (const entry of meta.infolist.entries) {
    if (entry.name.includes('.')) names.add(entry.name);
  }
  return [...names];
}

/**
 * Map a dot path to a form relationship field on the same resource.
 * `company.name` → `companyId` BelongsTo `companies`
 * `categories.name` → `categoryIds` ManyToMany `categories`
 */
export function resolveRelationDisplayBinding(
  meta: ResourceMeta,
  path: string,
): RelationDisplayBinding | null {
  if (!path.includes('.')) return null;

  const segments = path.split('.').filter(Boolean);
  if (segments.length < 2) return null;

  const root = segments[0]!;
  const attribute = segments.slice(1).join('.');

  for (const field of meta.fields) {
    if (!field.relation) continue;
    if (!relationPathMatchesField(root, field)) continue;

    return {
      path,
      root,
      attribute,
      fieldName: field.name,
      relation: field.relation,
    };
  }

  return null;
}

function relationPathMatchesField(root: string, field: FieldConfig): boolean {
  const relation = field.relation;
  if (!relation) return false;

  const resource = relation.resource;
  const singular = singularizeResourceSlug(resource);
  const fieldRoot = field.name.replace(/Ids?$/, '');

  if (root === resource || root === singular) return true;
  if (root === field.name || root === fieldRoot) return true;
  if (relation.kind === 'belongsTo' && root === field.name.replace(/Id$/, '')) return true;

  return false;
}

/** Resolve all display bindings for a resource meta. */
export function resolveRelationDisplayBindings(
  meta: ResourceMeta,
): RelationDisplayBinding[] {
  const seen = new Set<string>();
  const bindings: RelationDisplayBinding[] = [];

  for (const path of collectDisplayPaths(meta)) {
    const binding = resolveRelationDisplayBinding(meta, path);
    if (!binding || seen.has(binding.path)) continue;
    seen.add(binding.path);
    bindings.push(binding);
  }

  return bindings;
}
