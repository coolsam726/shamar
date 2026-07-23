import type {
  FieldConfig,
  RelationConfig,
  RelationSearchResult,
  ResourceMeta,
  ResourceRegistry,
} from '@shamar/core';
import { relationTitleAttribute, relationUsesListTable } from '@shamar/core';
import type { ListHeader } from './list-headers.js';
import type { RelationTableColumn } from './relation-table.js';
import { relationTableListMeta } from './relation-table.js';

export interface RelationUiConfig {
  name: string;
  relatedResource: string;
  singularLabel: string;
  searchUrl: string;
  quickCreateUrl: string | null;
  createUrl: string | null;
  detailUrlBase: string;
  attachUrl?: string | null;
  detachUrl?: string | null;
  readonly: boolean;
  required: boolean;
  kind: RelationConfig['kind'];
  widget: NonNullable<RelationConfig['widget']>;
  foreignKey?: string;
  parentId?: string | null;
  /** BelongsTo */
  initialId?: string | null;
  initialLabel?: string;
  /** M2M / HasMany */
  initialItems?: RelationSearchResult[];
  /** Preloaded options for radio / checkbox list */
  options?: RelationSearchResult[];
  checkboxColumns?: number;
  checkboxFramed?: boolean;
  cascadeWildcards?: boolean;
  groupBy?: string;
  /** Attribute used as dehydrated form values (default `id`). */
  valueAttribute?: string;
  /** True when hasMany on create — show empty state until parent is saved */
  requiresParent?: boolean;
  /**
   * Scoped list endpoint for hasMany RelationTable widgets
   * (`GET …/relation-table?field=&parentId=`).
   */
  listUrl?: string | null;
  /** Related resource table columns (excluding the parent FK display). */
  columns?: RelationTableColumn[];
  /** Filter metadata from the related resource table. */
  listHeaders?: ListHeader[];
  /** Default page size for the embedded list. */
  perPage?: number;
  defaultSort?: string | null;
  defaultDirection?: 'asc' | 'desc' | null;
}

export function isRelationField(field: FieldConfig): boolean {
  return field.relation != null;
}

export function relationWidget(field: FieldConfig): NonNullable<RelationConfig['widget']> {
  return field.relation?.widget ?? (field.multiple ? 'combobox' : 'combobox');
}

/**
 * Build Alpine `data-shamar-m2o/m2m-config` payload for a relation field.
 */
export function buildRelationUiConfig(options: {
  field: FieldConfig;
  parentMeta: ResourceMeta;
  relatedMeta: ResourceMeta;
  basePath: string;
  record: Record<string, unknown> | null;
  initialItems?: RelationSearchResult[];
  preloadedOptions?: RelationSearchResult[];
  operation: 'create' | 'edit' | 'show';
}): RelationUiConfig {
  const { field, parentMeta, relatedMeta, basePath, record, operation } = options;
  const relation = field.relation!;
  const widget = relation.widget ?? 'combobox';
  const parentId = record?.id != null ? String(record.id) : null;
  const searchParams = new URLSearchParams({ field: field.name });
  // Do not scope search by parent — Add/search should find all related records.
  // Linked rows are provided via `initialItems` from a scoped adapter.search.

  const searchUrl = `${basePath}/${parentMeta.slug}/relation-search?${searchParams.toString()}`;
  const quickCreateUrl = relation.createOption
    ? `${basePath}/${parentMeta.slug}/relation-quick-create`
    : null;
  const attachUrl =
    relation.kind === 'hasMany'
      ? `${basePath}/${parentMeta.slug}/relation-attach`
      : null;
  const detachUrl =
    relation.kind === 'hasMany'
      ? `${basePath}/${parentMeta.slug}/relation-detach`
      : null;

  let createUrl: string | null = null;
  if (relation.createAndEditOption) {
    createUrl = `${basePath}/${relatedMeta.slug}/create`;
    if (relation.kind === 'hasMany' && relation.foreignKey && parentId) {
      createUrl += `?${encodeURIComponent(relation.foreignKey)}=${encodeURIComponent(parentId)}`;
    }
  }

  const initialItems = options.initialItems ?? [];
  const first = initialItems[0];

  const useListTable =
    widget === 'table' &&
    relation.kind === 'hasMany' &&
    !!relation.foreignKey &&
    !!parentId &&
    relationUsesListTable(relation);
  const listMeta = useListTable
    ? relationTableListMeta(relatedMeta, relation.foreignKey)
    : null;

  const listParams = new URLSearchParams({ field: field.name });
  if (parentId) listParams.set('parentId', parentId);

  return {
    name: field.name,
    relatedResource: relatedMeta.slug,
    singularLabel: relatedMeta.singularLabel,
    searchUrl,
    quickCreateUrl,
    createUrl,
    detailUrlBase: `${basePath}/${relatedMeta.slug}`,
    attachUrl,
    detachUrl,
    readonly: options.operation === 'show' || !!field.readonly,
    required: !!field.required,
    kind: relation.kind,
    widget,
    foreignKey: relation.foreignKey,
    parentId,
    initialId:
      relation.kind === 'belongsTo'
        ? first?.id ?? (record?.[field.name] != null ? String(record[field.name]) : null)
        : null,
    initialLabel: relation.kind === 'belongsTo' ? first?.label ?? '' : undefined,
    initialItems: relation.kind === 'belongsTo' ? undefined : useListTable ? [] : initialItems,
    options: options.preloadedOptions,
    checkboxColumns: field.checkboxColumns ?? relation.checkboxColumns ?? 2,
    checkboxFramed: field.checkboxFramed ?? relation.checkboxFramed ?? true,
    cascadeWildcards: field.cascadeWildcards ?? relation.cascadeWildcards ?? false,
    groupBy: field.groupBy ?? relation.groupBy ?? '',
    valueAttribute: relation.valueAttribute ?? 'id',
    requiresParent: relation.kind === 'hasMany' && (operation === 'create' || !parentId),
    listUrl: useListTable
      ? `${basePath}/${parentMeta.slug}/relation-table?${listParams.toString()}`
      : null,
    columns: listMeta?.columns ?? [],
    listHeaders: listMeta?.listHeaders ?? [],
    perPage: 10,
    defaultSort: relatedMeta.defaultSort?.field ?? null,
    defaultDirection: relatedMeta.defaultSort?.direction ?? 'asc',
  };
}

export function resolveRelatedMeta(
  registry: ResourceRegistry,
  relation: RelationConfig,
): ResourceMeta {
  return registry.require(relation.resource);
}

export function collectRelationIds(
  field: FieldConfig,
  record: Record<string, unknown> | null,
): string[] {
  if (!record) return [];
  const raw = record[field.name];
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item)).filter(Boolean);
  }
  if (raw != null && raw !== '') {
    return [String(raw)];
  }
  return [];
}

export function recordSummaryLabel(
  meta: ResourceMeta,
  record: Record<string, unknown>,
  titleAttribute?: string,
): string {
  const attr =
    titleAttribute ??
    meta.recordTitleField ??
    meta.fields.find((field) => field.name === 'name')?.name ??
    'id';
  const value = record[attr];
  if (value != null && String(value).trim()) return String(value);
  return String(record.id ?? '');
}

export { relationTitleAttribute };
