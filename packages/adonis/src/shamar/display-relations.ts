import type { DataAdapter, ResourceMeta, ResourceRegistry } from '@shamar/core';
import {
  relationTitleAttribute,
  resolveRelationDisplayBindings,
  type RelationDisplayBinding,
} from '@shamar/core';

/**
 * Hydrate relation dot-paths on records for table columns / infolist entries.
 * e.g. `company.name` attaches `record.company = { name: 'Acme' }`.
 */
export async function hydrateRecordsForDisplay(
  meta: ResourceMeta,
  records: Record<string, unknown>[],
  registry: ResourceRegistry,
  adapter: DataAdapter,
): Promise<void> {
  if (records.length === 0) return;

  const bindings = resolveRelationDisplayBindings(meta);
  if (bindings.length === 0) return;

  const groups = groupBindingsByField(bindings);
  const lookups = new Map<string, Map<string, Record<string, unknown>>>();

  for (const [groupKey, group] of groups) {
    const ids = collectRelatedIds(records, group.binding);
    if (ids.size === 0) continue;

    const relatedMeta = registry.require(group.binding.relation.resource);
    const titleAttribute = relationTitleAttribute(group.binding.relation);
    const results = await adapter.search(relatedMeta, {
      ids: [...ids],
      titleAttribute,
      limit: Math.max(ids.size, 25),
    });

    const byId = new Map<string, Record<string, unknown>>();
    for (const row of results) {
      const id = String(row.id);
      const existing = byId.get(id) ?? { id };
      for (const binding of group.bindings) {
        existing[binding.attribute] =
          binding.attribute === titleAttribute ? row.label : row.label;
      }
      byId.set(id, existing);
    }

    lookups.set(groupKey, byId);
  }

  for (const record of records) {
    for (const [groupKey, group] of groups) {
      const byId = lookups.get(groupKey);
      if (!byId) continue;
      attachRelatedRecord(record, group.binding, byId);
    }
  }
}

interface BindingGroup {
  binding: RelationDisplayBinding;
  bindings: RelationDisplayBinding[];
}

function groupBindingsByField(bindings: RelationDisplayBinding[]): Map<string, BindingGroup> {
  const groups = new Map<string, BindingGroup>();
  for (const binding of bindings) {
    const key = binding.fieldName;
    const existing = groups.get(key);
    if (existing) {
      existing.bindings.push(binding);
      continue;
    }
    groups.set(key, { binding, bindings: [binding] });
  }
  return groups;
}

function collectRelatedIds(
  records: Record<string, unknown>[],
  binding: RelationDisplayBinding,
): Set<string> {
  const ids = new Set<string>();
  for (const record of records) {
    const raw = record[binding.fieldName];
    if (binding.relation.kind === 'belongsTo') {
      if (raw != null && raw !== '') ids.add(String(raw));
      continue;
    }
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (item != null && String(item).trim() !== '') ids.add(String(item));
      }
    }
  }
  return ids;
}

function attachRelatedRecord(
  record: Record<string, unknown>,
  binding: RelationDisplayBinding,
  byId: Map<string, Record<string, unknown>>,
): void {
  const raw = record[binding.fieldName];

  if (binding.relation.kind === 'belongsTo') {
    const id = raw != null && raw !== '' ? String(raw) : null;
    record[binding.root] = id ? (byId.get(id) ?? null) : null;
    return;
  }

  const idList = Array.isArray(raw) ? raw.map((item) => String(item)).filter(Boolean) : [];
  record[binding.root] = idList
    .map((id) => byId.get(id))
    .filter((item): item is Record<string, unknown> => item != null);
}
