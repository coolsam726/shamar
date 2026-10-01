import { escapeHtml, WireKernel, type WireComponent, type WireRequest } from '@shamar/wire';
import type { DataAdapter, FieldConfig, ResourceMeta } from '@shamar/core';
import { recordTitle } from '../shamar/list-query.js';

export interface ManagedRelation {
  field: string;
  label: string;
  relatedSlug: string;
  foreignKey: string;
}

const kernelSecret = 'relation-manager';

function relationsOf(meta: ResourceMeta): ManagedRelation[] {
  return meta.fields.flatMap((field) => {
    const relation = field.relation;
    if (!relation || relation.kind !== 'hasMany' || !relation.foreignKey) return [];
    return [
      {
        field: field.name,
        label: typeof field.label === 'string' && field.label ? field.label : field.name,
        relatedSlug: relation.resource,
        foreignKey: relation.foreignKey,
      },
    ];
  });
}

async function loadRows(
  adapter: DataAdapter,
  registry: { get(slug: string): ResourceMeta | undefined },
  relation: ManagedRelation,
  parentId: string,
): Promise<Array<{ id: string; label: string }>> {
  const related = registry.get(relation.relatedSlug);
  if (!related) return [];
  const page = await adapter.list(related, {
    page: 1,
    perPage: 20,
    scope: { [relation.foreignKey]: parentId },
  });
  return page.items
    .filter((row) => row.id != null && String(row.id) !== '')
    .map((row) => ({
      id: String(row.id),
      label: recordTitle(related, row),
    }));
}

function renderManager(component: WireComponent, meta: ResourceMeta): string {
  const relation = relationsOf(meta).find((item) => item.field === component.data.field);
  const title = relation?.label ?? 'Related';
  const rows = Array.isArray(component.data.rows)
    ? (component.data.rows as Array<{ id: string; label: string }>)
    : [];
  const list = rows
    .map(
      (row) =>
        `<li wire:key="${escapeHtml(row.id)}" class="flex items-center justify-between gap-3 px-3 py-2 text-sm"><span class="text-heading">${escapeHtml(row.label)}</span><button type="button" wire:click="remove('${escapeHtml(row.id)}')" class="text-xs text-fg-danger">Remove</button></li>`,
    )
    .join('');
  return `<section class="shamar-card rounded-xl">
    <header class="px-4 py-3 border-b border-card-border text-sm font-semibold text-heading">${escapeHtml(title)}</header>
    ${list ? `<ul>${list}</ul>` : '<p class="px-4 py-3 text-sm text-body-subtle">No related records</p>'}
  </section>`;
}

export async function relationManagerHtml(
  basePath: string,
  adapter: DataAdapter,
  parent: ResourceMeta,
  record: Record<string, unknown>,
  lookup: { get(slug: string): ResourceMeta | undefined },
): Promise<string> {
  const parentId = record.id == null ? '' : String(record.id);
  if (!parentId) return '';
  const blocks: string[] = [];
  for (const relation of relationsOf(parent)) {
    const rows = await loadRows(adapter, lookup, relation, parentId);
    blocks.push(mountOne(basePath, parent, relation, parentId, rows));
  }
  return blocks.join('');
}

function mountOne(
  basePath: string,
  parent: ResourceMeta,
  relation: ManagedRelation,
  parentId: string,
  rows: Array<{ id: string; label: string }>,
): string {
  const endpoint = `${basePath.replace(/\/+$/, '')}/wire`;
  const kernel = new WireKernel(`${kernelSecret}:${parent.slug}:${relation.field}`, {
    'relation-manager': {
      create: () => ({
        data: { field: relation.field, parentSlug: parent.slug, parentId, rows },
      }),
      render: (component) => renderManager(component, parent),
    },
  });
  return kernel.mount('relation-manager', endpoint).html;
}

export function updateRelationManager(
  basePath: string,
  adapter: DataAdapter,
  parent: ResourceMeta,
  lookup: { get(slug: string): ResourceMeta | undefined },
  request: WireRequest,
) {
  const endpoint = `${basePath.replace(/\/+$/, '')}/wire`;
  const field = String(request.snapshot?.data?.field ?? '');
  const parentId = String(request.snapshot?.data?.parentId ?? '');
  const relation = relationsOf(parent).find((item) => item.field === field);
  const kernel = new WireKernel(`${kernelSecret}:${parent.slug}:${field}`, {
    'relation-manager': {
      create: () => ({
        data: {
          field,
          parentSlug: parent.slug,
          parentId,
          rows: [] as Array<{ id: string; label: string }>,
        },
        async remove(this: WireComponent, id: string) {
          if (!relation) return;
          const related = lookup.get(relation.relatedSlug);
          if (!related) return;
          await adapter.delete(related, id);
          this.data.rows = await loadRows(adapter, lookup, relation, parentId);
        },
      } as WireComponent),
      async refresh(component) {
        if (!relation || !parentId) return;
        const fieldName = String(component.data.field ?? field);
        const ownerId = String(component.data.parentId ?? parentId);
        component.data.rows = await loadRows(adapter, lookup, relation, ownerId);
        component.data.field = fieldName;
        component.data.parentId = ownerId;
      },
      render: (component) => renderManager(component, parent),
    },
  });
  return kernel.update(request, endpoint);
}

export function relationFields(meta: ResourceMeta): FieldConfig[] {
  return meta.fields.filter((field) => field.relation?.kind === 'hasMany' && field.relation.foreignKey);
}
