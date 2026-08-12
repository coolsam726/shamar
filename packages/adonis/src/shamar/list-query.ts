import type { FieldValueHost, ListQuery, PaginatedResult, ResourceMeta } from '@shamar/core';
import {
  DEFAULT_LIST_PER_PAGE,
  formatCurrencyValue,
  getRecordValue,
  hydrateField,
  parseDateValue,
  parseCurrencyInput,
  resolveRelationDisplayBinding,
  toFormDateInputValue,
} from '@shamar/core';
import { parseListFilters } from './list-headers.js';

export { parseDateValue, parseCurrencyInput, toFormDateInputValue };

export interface ListViewQuery {
  search?: string;
  sort?: string;
  direction?: string;
  perPage?: number | string;
  page?: number | string;
  filters?: string | unknown[];
  groupBy?: string;
  trashed?: string | boolean;
}

export interface PaginationLink {
  type: 'page' | 'ellipsis';
  page?: number;
  label?: string;
  active?: boolean;
  href?: string;
}

export interface PaginationContext {
  page: number;
  pageCount: number;
  total: number;
  formAction: string;
  prevHref?: string;
  nextHref?: string;
  links: PaginationLink[];
}

export const LIST_ALL_RECORDS_PER_PAGE = 1000;

/** Max IDs loaded for cyclic prev/next on show/edit (PyVELM-style). */
export const RECORD_NAV_CAP = 5000;

export interface RecordPager {
  prevUrl: string;
  nextUrl: string;
  index: number;
  total: number;
  /** Query string including leading `?`, or empty. */
  navQuery: string;
}

export function normalizeListQuery(raw: ListViewQuery, defaults?: { perPage?: number }): ListQuery {
  const sort = typeof raw.sort === 'string' ? raw.sort.trim() || undefined : undefined;
  const direction =
    raw.direction === 'asc' || raw.direction === 'desc' ? raw.direction : undefined;
  const search = typeof raw.search === 'string' ? raw.search.trim() || undefined : undefined;
  const groupBy =
    typeof raw.groupBy === 'string' ? raw.groupBy.trim() || undefined : undefined;

  const fallbackPerPage = defaults?.perPage ?? DEFAULT_LIST_PER_PAGE;
  const perPageRaw = raw.perPage;
  const wantsAll =
    perPageRaw === 'all' || String(perPageRaw).toLowerCase() === 'all';
  const perPage = wantsAll
    ? LIST_ALL_RECORDS_PER_PAGE
    : Math.min(
        LIST_ALL_RECORDS_PER_PAGE,
        Math.max(5, Number(perPageRaw) || fallbackPerPage),
      );
  const page = Math.max(1, Number(raw.page) || 1);

  const filters = parseListFilters(raw.filters);

  return {
    page,
    perPage,
    search,
    sort,
    direction: sort ? direction : undefined,
    filters: filters.length ? filters : undefined,
    groupBy,
  };
}

export function buildListQueryString(
  query: ListViewQuery = {},
  overrides: ListViewQuery = {},
  options?: { defaultPerPage?: number },
): string {
  const merged = { ...query, ...overrides };
  const params = new URLSearchParams();
  const defaultPerPage = options?.defaultPerPage ?? DEFAULT_LIST_PER_PAGE;

  const search = merged.search != null ? String(merged.search).trim() : '';
  if (search) params.set('search', search);

  const sort = merged.sort != null ? String(merged.sort).trim() : '';
  if (sort) {
    params.set('sort', sort);
    if (merged.direction === 'asc' || merged.direction === 'desc') {
      params.set('direction', merged.direction);
    }
  }

  const perPageRaw = merged.perPage;
  if (
    perPageRaw === 'all' ||
    String(perPageRaw).toLowerCase() === 'all' ||
    Number(perPageRaw) === LIST_ALL_RECORDS_PER_PAGE
  ) {
    params.set('perPage', 'all');
  } else {
    const perPage = Number(perPageRaw);
    if (perPage && perPage !== defaultPerPage) params.set('perPage', String(perPage));
  }

  const page = Number(merged.page);
  if (page > 1) params.set('page', String(page));

  if (merged.filters != null) {
    const filters =
      typeof merged.filters === 'string'
        ? merged.filters
        : Array.isArray(merged.filters)
          ? JSON.stringify(merged.filters)
          : '';
    if (filters && filters !== '[]') params.set('filters', filters);
  }

  const groupBy = merged.groupBy != null ? String(merged.groupBy).trim() : '';
  if (groupBy) params.set('groupBy', groupBy);

  const value = params.toString();
  return value ? `?${value}` : '';
}

export function listResourcePath(
  basePath: string,
  slug: string,
  query: ListViewQuery = {},
  overrides: ListViewQuery = {},
  options?: { defaultPerPage?: number },
): string {
  return `${basePath}/${slug}${buildListQueryString(query, overrides, options)}`;
}

function paginationWindow(current: number, pageCount: number): Array<number | 'ellipsis'> {
  if (pageCount <= 1) return pageCount === 1 ? [1] : [];
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, pageCount, current]);
  for (let offset = -1; offset <= 1; offset += 1) {
    const page = current + offset;
    if (page >= 1 && page <= pageCount) pages.add(page);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result: Array<number | 'ellipsis'> = [];
  for (let index = 0; index < sorted.length; index += 1) {
    const page = sorted[index]!;
    if (index > 0 && page - sorted[index - 1]! > 1) {
      result.push('ellipsis');
    }
    result.push(page);
  }
  return result;
}

export function buildPaginationContext(
  basePath: string,
  slug: string,
  query: ListViewQuery,
  result: PaginatedResult,
  options?: { defaultPerPage?: number },
): PaginationContext {
  const pathOpts = { defaultPerPage: options?.defaultPerPage };
  const links: PaginationLink[] = paginationWindow(result.page, result.pageCount).map(
    (entry) => {
      if (entry === 'ellipsis') {
        return { type: 'ellipsis' };
      }
      return {
        type: 'page',
        page: entry,
        label: String(entry),
        active: entry === result.page,
        href: listResourcePath(basePath, slug, query, { page: entry }, pathOpts),
      };
    },
  );

  return {
    page: result.page,
    pageCount: result.pageCount,
    total: result.total,
    formAction: `${basePath}/${slug}`,
    prevHref:
      result.page > 1
        ? listResourcePath(basePath, slug, query, { page: result.page - 1 }, pathOpts)
        : undefined,
    nextHref:
      result.page < result.pageCount
        ? listResourcePath(basePath, slug, query, { page: result.page + 1 }, pathOpts)
        : undefined,
    links,
  };
}

export function sortColumnUrl(
  basePath: string,
  slug: string,
  query: ListViewQuery,
  column: string,
): string {
  const nextDirection =
    query.sort === column && query.direction !== 'desc' ? 'desc' : 'asc';
  return listResourcePath(basePath, slug, query, {
    sort: column,
    direction: nextDirection,
    page: 1,
  });
}

/** List context preserved on show/edit links (search/sort only). */
export function recordNavQuery(query: ListViewQuery = {}): string {
  return buildListQueryString({
    search: query.search,
    sort: query.sort,
    direction: query.direction,
  });
}

export function recordPath(
  basePath: string,
  slug: string,
  id: string | number,
  mode: 'show' | 'edit',
  navQuery = '',
): string {
  const path =
    mode === 'edit'
      ? `${basePath}/${slug}/${id}/edit`
      : `${basePath}/${slug}/${id}`;
  return `${path}${navQuery}`;
}

/**
 * Build cyclic prev/next pager for the current ordered ID list.
 * Returns null when the record is not in the set.
 */
export function buildRecordPager(options: {
  basePath: string;
  slug: string;
  recordId: string;
  mode: 'show' | 'edit';
  ids: string[];
  navQuery?: string;
}): RecordPager | null {
  const ids = options.ids.map(String);
  const idx = ids.indexOf(String(options.recordId));
  if (idx < 0 || ids.length === 0) return null;

  const total = ids.length;
  const prevId = total === 1 ? ids[0]! : ids[(idx - 1 + total) % total]!;
  const nextId = total === 1 ? ids[0]! : ids[(idx + 1) % total]!;
  const navQuery = options.navQuery ?? '';

  return {
    prevUrl: recordPath(options.basePath, options.slug, prevId, options.mode, navQuery),
    nextUrl: recordPath(options.basePath, options.slug, nextId, options.mode, navQuery),
    index: idx + 1,
    total,
    navQuery,
  };
}

/**
 * BelongsTo display columns (e.g. `company.name`) → URL for the related record.
 * Returns null for non-relation columns or when the FK is empty.
 */
export function relatedListLink(
  meta: ResourceMeta,
  record: Record<string, unknown>,
  column: { name: string },
  basePath: string,
): string | null {
  const binding = resolveRelationDisplayBinding(meta, column.name);
  if (!binding || binding.relation.kind !== 'belongsTo') return null;

  const nested = record[binding.root];
  let id: string | null = null;
  if (nested && typeof nested === 'object' && nested !== null && 'id' in nested) {
    const nestedId = (nested as { id?: unknown }).id;
    if (nestedId != null && nestedId !== '') id = String(nestedId);
  }
  if (!id) {
    const fk = record[binding.fieldName];
    if (fk != null && fk !== '') id = String(fk);
  }
  if (!id) return null;

  return `${basePath}/${binding.relation.resource}/${id}`;
}

/** Show URL for the current list row. */
export function listRecordHref(
  meta: ResourceMeta,
  record: Record<string, unknown>,
  basePath: string,
  navQuery = '',
): string {
  return `${basePath}/${meta.slug}/${record.id}${navQuery}`;
}

function formatObjectValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => formatObjectValue(item)).filter(Boolean).join(', ');
  }
  const record = value as Record<string, unknown>;
  if ('key' in record && 'value' in record) {
    return `${record.key}: ${record.value ?? ''}`;
  }
  return Object.entries(record)
    .filter(([key]) => key !== '_id' && key !== '__v')
    .map(([key, entry]) => `${key}: ${entry ?? ''}`)
    .join(' · ');
}

export function cellValue(
  record: Record<string, unknown>,
  column: {
    name: string;
    type?: string;
    format?: string;
    currency?: { code: string; locale?: string; precision?: number };
  },
): string {
  const value = getRecordValue(record, column.name);
  if (
    column.type === 'boolean' ||
    column.format === 'boolean' ||
    column.format === 'toggle'
  ) {
    return value ? 'Yes' : 'No';
  }
  if (value == null || value === '') return '—';

  if (Array.isArray(value)) {
    if (value.some((item) => item && typeof item === 'object')) {
      return (
        value
          .map((item) => formatObjectValue(item))
          .filter(Boolean)
          .join('; ') || '—'
      );
    }
    return value.map((item) => String(item)).filter(Boolean).join(', ') || '—';
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const bson = value as { _bsontype?: string };
    if (bson._bsontype === 'ObjectId' || bson._bsontype === 'ObjectID') {
      return String(value);
    }
    return formatObjectValue(value) || '—';
  }

  if (column.format === 'currency' || column.currency) {
    const formatted = formatCurrencyValue(
      value,
      column.currency ?? { code: 'USD', precision: 2 },
    );
    if (formatted != null) return formatted;
  }

  const dateMode = resolveDateFormat(column);
  if (dateMode) {
    return formatDateValue(value, dateMode) ?? String(value);
  }

  return String(value);
}

export function detailValue(
  record: Record<string, unknown>,
  field: {
    name: string;
    type?: string;
    format?: string;
    currency?: { code: string; locale?: string; precision?: number };
  },
): string {
  return cellValue(record, field);
}

/** Labels for badge rendering — one entry per array item (tags, multi-select, etc.). */
export function badgeValues(
  record: Record<string, unknown>,
  field: { name: string },
): string[] {
  const value = getRecordValue(record, field.name);
  if (value == null || value === '') return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  const text = String(value).trim();
  return text ? [text] : [];
}

function resolveDateFormat(column: {
  type?: string;
  format?: string;
}): 'date' | 'datetime' | null {
  if (column.format === 'date' || column.type === 'date') return 'date';
  if (column.format === 'datetime' || column.type === 'datetime') return 'datetime';
  return null;
}

/**
 * Human-readable date / datetime (locale-aware).
 * e.g. "Jan 15, 2024" or "Jan 15, 2024, 3:45 PM"
 */
export function formatDateValue(
  value: unknown,
  mode: 'date' | 'datetime',
): string | null {
  const date = parseDateValue(value);
  if (!date) return null;

  if (mode === 'date') {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/** Coerce adapter values into form-control-friendly state. */
export function toFormControlValue(value: unknown, field: FieldValueHost): unknown {
  return hydrateField(field, value);
}

export function recordTitle(
  meta: ResourceMeta,
  record: Record<string, unknown>,
): string {
  const value = record[meta.recordTitleField];
  if (value != null && value !== '') return String(value);
  const id = record.id;
  return id != null ? `#${id}` : meta.singularLabel;
}

export function formInputType(field: { type: string; revealable?: boolean }): string {
  switch (field.type) {
    case 'email':
      return 'email';
    case 'password':
      return 'password';
    case 'number':
      return 'number';
    case 'tel':
      return 'tel';
    case 'url':
      // Use text so path-absolute media URLs (e.g. /admin/media/files/:id/raw)
      // are not rejected by the browser's native type=url constraint.
      return 'text';
    case 'date':
    case 'week':
      return 'date';
    case 'month':
      return 'month';
    case 'datetime':
      return 'datetime-local';
    case 'time':
      return 'time';
    case 'slider':
      return 'range';
    case 'color':
      return 'color';
    case 'hidden':
      return 'hidden';
    case 'file':
    case 'filePicker':
    case 'image':
      return 'file';
    default:
      return 'text';
  }
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Extra native attributes for text-like controls (min/max/length/pattern/etc.).
 * Returned as a raw HTML attribute string for Edge `{{{ fieldInputAttrs(field) }}}`.
 */
export function fieldInputAttrs(field: {
  autocomplete?: string;
  inputMode?: string;
  minLength?: number;
  maxLength?: number;
  minValue?: number | string;
  maxValue?: number | string;
  step?: number | string;
  pattern?: string;
  accept?: string;
  datalist?: string[];
  name?: string;
  extraInputAttributes?: Record<string, string>;
}): string {
  const parts: string[] = [];

  if (field.autocomplete) parts.push(`autocomplete="${escapeAttr(field.autocomplete)}"`);
  if (field.inputMode) parts.push(`inputmode="${escapeAttr(field.inputMode)}"`);
  if (field.minLength != null) parts.push(`minlength="${field.minLength}"`);
  if (field.maxLength != null) parts.push(`maxlength="${field.maxLength}"`);
  if (field.minValue != null) parts.push(`min="${escapeAttr(String(field.minValue))}"`);
  if (field.maxValue != null) parts.push(`max="${escapeAttr(String(field.maxValue))}"`);
  if (field.step != null) parts.push(`step="${escapeAttr(String(field.step))}"`);
  if (field.pattern) parts.push(`pattern="${escapeAttr(field.pattern)}"`);
  if (field.accept) parts.push(`accept="${escapeAttr(field.accept)}"`);
  if (field.datalist?.length && field.name) {
    parts.push(`list="datalist-${escapeAttr(field.name)}"`);
  }
  if (field.extraInputAttributes) {
    for (const [key, value] of Object.entries(field.extraInputAttributes)) {
      if (value == null || value === '') {
        parts.push(escapeAttr(key));
      } else {
        parts.push(`${escapeAttr(key)}="${escapeAttr(value)}"`);
      }
    }
  }

  return parts.join(' ');
}

export function fieldChecked(record: Record<string, unknown> | null, field: { name: string }): boolean {
  if (!record) return false;
  const value = record[field.name];
  return value === true || value === 1 || value === '1';
}

export function formSections(meta: ResourceMeta) {
  if (meta.form?.sections?.length) {
    return meta.form.sections.map((section) => ({
      name: section.name,
      title: section.title,
      description: section.description,
      kind: section.kind ?? 'section',
      icon: section.icon,
      card: section.card ?? ((section.kind ?? 'section') === 'section'),
      columns: section.columns ?? 2,
      collapsible: section.collapsible,
      collapsed: section.collapsed,
      dense: section.dense,
      gap: section.gap,
      extraAttributes: section.extraAttributes,
      fields: section.fields.filter((field) => !field.hiddenOnForm),
    }));
  }

  return [
    {
      name: '_fields',
      title: '',
      kind: 'plain' as const,
      fields: meta.fields.filter((field) => !field.hiddenOnForm),
      columns: 2 as const,
    },
  ];
}

/** Nested schema tree for form rendering (Filament 5). */
export function formSchemaTree(meta: ResourceMeta) {
  const tree = meta.form?.schema;
  if (tree?.length) return pruneFormNodes(tree);
  return formSections(meta).map((section) => {
    const s = section as unknown as {
      name: string;
      title?: string;
      description?: string;
      kind?: string;
      icon?: string;
      card?: boolean;
      columns?: number;
      fields?: import('@shamar/core').FieldConfig[];
    };
    return {
      kind: (s.kind ?? 'section') as 'section' | 'fieldset' | 'plain',
      name: s.name,
      title: s.title,
      description: s.description,
      icon: s.icon,
      card: s.card,
      columns: (s.columns ?? 2) as 1 | 2 | 3 | 4,
      children: (s.fields ?? []).map((field) => ({
        kind: 'field' as const,
        name: field.name,
        columnSpan: field.columnSpan,
        columnStart: field.columnStart,
        field,
      })),
    };
  });
}

function pruneFormNodes(nodes: import('@shamar/core').SchemaNode[]): import('@shamar/core').SchemaNode[] {
  return nodes
    .map((node) => {
      if (node.kind === 'field') {
        if (node.field?.hiddenOnForm) return null;
        return node;
      }
      const children = node.children ? pruneFormNodes(node.children) : undefined;
      return { ...node, children };
    })
    .filter((n): n is import('@shamar/core').SchemaNode => n != null);
}

export function detailSections(meta: ResourceMeta) {
  if (meta.infolist?.sections?.length) {
    return meta.infolist.sections.map((section) => ({
      name: section.name,
      title: section.title,
      description: section.description,
      kind: section.kind ?? 'section',
      icon: section.icon,
      card: section.card ?? ((section.kind ?? 'section') === 'section'),
      columns: section.columns ?? 2,
      collapsible: section.collapsible,
      collapsed: section.collapsed,
      dense: section.dense,
      gap: section.gap,
      extraAttributes: section.extraAttributes,
      entries: section.entries.filter((entry) => !entry.hiddenOnDetail),
      fields: section.entries
        .filter((entry) => !entry.hiddenOnDetail)
        .map((entry) => entryToDetailField(entry)),
    }));
  }

  return [
    {
      name: '_entries',
      title: '',
      kind: 'plain' as const,
      fields: meta.fields.filter((field) => !field.hiddenOnDetail),
      columns: 2 as const,
      entries: [],
    },
  ];
}

/** Nested schema tree for detail/infolist rendering. */
export function detailSchemaTree(meta: ResourceMeta) {
  const tree = meta.infolist?.schema;
  if (tree?.length) return pruneDetailNodes(tree);
  return detailSections(meta).map((section) => {
    const s = section as unknown as {
      name: string;
      title?: string;
      description?: string;
      kind?: string;
      icon?: string;
      card?: boolean;
      columns?: number;
      fields?: import('@shamar/core').InfolistEntryConfig[];
    };
    return {
      kind: (s.kind ?? 'section') as 'section' | 'fieldset' | 'plain',
      name: s.name,
      title: s.title,
      description: s.description,
      icon: s.icon,
      card: s.card,
      columns: (s.columns ?? 2) as 1 | 2 | 3 | 4,
      children: (s.fields ?? []).map((field) => ({
        kind: 'entry' as const,
        name: field.name,
        columnSpan: field.columnSpan,
        columnStart: field.columnStart,
        entry: field,
      })),
    };
  });
}

function entryToDetailField(entry: {
  name: string;
  type: string;
  label?: string;
  help?: string;
  hint?: string;
  columnSpan?: unknown;
  columnStart?: number;
  format?: string;
  url?: boolean | string;
  copyable?: boolean;
  icon?: string;
  falseIcon?: string;
  currency?: { code: string; locale?: string; precision?: number };
  alignment?: string;
}) {
  return {
    name: entry.name,
    type: entry.type,
    label: entry.label ?? entry.name,
    help: entry.help,
    hint: entry.hint,
    columnSpan: entry.columnSpan,
    columnStart: entry.columnStart,
    format: entry.format,
    url: entry.url,
    copyable: entry.copyable,
    icon: entry.icon,
    falseIcon: entry.falseIcon,
    currency: entry.currency,
    alignment: entry.alignment,
  };
}

function pruneDetailNodes(nodes: import('@shamar/core').SchemaNode[]): import('@shamar/core').SchemaNode[] {
  return nodes
    .map((node) => {
      if (node.kind === 'entry') {
        if (node.entry?.hiddenOnDetail) return null;
        return node;
      }
      if (node.kind === 'field') return null;
      const children = node.children ? pruneDetailNodes(node.children) : undefined;
      return { ...node, children };
    })
    .filter((n): n is import('@shamar/core').SchemaNode => n != null);
}


export function sectionQueryPrefix(sectionKey: string): string {
  return `${sectionKey}_`;
}

export function readPrefixedListQuery(
  input: Record<string, unknown>,
  sectionKey: string,
): ListViewQuery {
  const prefix = sectionQueryPrefix(sectionKey);
  const read = (name: string) => input[`${prefix}${name}`];
  return {
    page: read('page') as ListViewQuery['page'],
    perPage: read('perPage') as ListViewQuery['perPage'],
    search: read('search') as ListViewQuery['search'],
    sort: read('sort') as ListViewQuery['sort'],
    direction: read('direction') as ListViewQuery['direction'],
    filters: read('filters') as ListViewQuery['filters'],
    groupBy: read('groupBy') as ListViewQuery['groupBy'],
    trashed: read('trashed') as ListViewQuery['trashed'],
  };
}

export function buildPrefixedListQueryString(
  sectionKey: string,
  query: ListViewQuery = {},
  overrides: ListViewQuery = {},
  options?: { defaultPerPage?: number; preserveQuery?: string },
): string {
  const prefix = sectionQueryPrefix(sectionKey);
  const params = new URLSearchParams(options?.preserveQuery?.replace(/^\?/, '') ?? '');
  for (const key of [...params.keys()]) {
    if (key.startsWith(prefix)) params.delete(key);
  }

  const merged = normalizeListQuery({ ...query, ...overrides }, { perPage: options?.defaultPerPage });
  const defaultPerPage = options?.defaultPerPage ?? DEFAULT_LIST_PER_PAGE;

  if (merged.search) params.set(`${prefix}search`, merged.search);

  if (merged.sort) {
    params.set(`${prefix}sort`, merged.sort);
    if (merged.direction === 'asc' || merged.direction === 'desc') {
      params.set(`${prefix}direction`, merged.direction);
    }
  }

  if (
    merged.perPage >= LIST_ALL_RECORDS_PER_PAGE ||
    overrides.perPage === 'all' ||
    String(merged.perPage).toLowerCase() === 'all'
  ) {
    params.set(`${prefix}perPage`, 'all');
  } else if (merged.perPage !== defaultPerPage) {
    params.set(`${prefix}perPage`, String(merged.perPage));
  }

  if (merged.page > 1) params.set(`${prefix}page`, String(merged.page));

  if (merged.filters?.length) {
    params.set(`${prefix}filters`, JSON.stringify(merged.filters));
  } else if (overrides.filters === '[]' || (Array.isArray(overrides.filters) && overrides.filters.length === 0)) {
    params.set(`${prefix}filters`, '[]');
  }

  if (merged.groupBy) {
    params.set(`${prefix}groupBy`, merged.groupBy);
  } else if (overrides.groupBy === '') {
    params.set(`${prefix}groupBy`, '');
  }

  const value = params.toString();
  return value ? `?${value}` : '';
}

export function pageSectionListPath(
  basePath: string,
  pageSlug: string,
  sectionKey: string,
  query: ListViewQuery = {},
  overrides: ListViewQuery = {},
  options?: { defaultPerPage?: number; preserveQuery?: string },
): string {
  return `${basePath}/${pageSlug}${buildPrefixedListQueryString(sectionKey, query, overrides, options)}`;
}

export function pageSectionSortColumnUrl(
  basePath: string,
  pageSlug: string,
  sectionKey: string,
  query: ListViewQuery,
  column: string,
  options?: { defaultPerPage?: number; preserveQuery?: string },
): string {
  const nextDirection =
    query.sort === column && query.direction !== 'desc' ? 'desc' : 'asc';
  return pageSectionListPath(
    basePath,
    pageSlug,
    sectionKey,
    query,
    { sort: column, direction: nextDirection, page: 1 },
    options,
  );
}

export function buildPageSectionPaginationContext(
  basePath: string,
  pageSlug: string,
  sectionKey: string,
  query: ListViewQuery,
  result: PaginatedResult,
  options?: { defaultPerPage?: number; preserveQuery?: string },
): PaginationContext {
  const pathOpts = {
    defaultPerPage: options?.defaultPerPage,
    preserveQuery: options?.preserveQuery,
  };
  const links: PaginationLink[] = paginationWindow(result.page, result.pageCount).map(
    (entry) => {
      if (entry === 'ellipsis') {
        return { type: 'ellipsis' };
      }
      return {
        type: 'page',
        page: entry,
        label: String(entry),
        active: entry === result.page,
        href: pageSectionListPath(
          basePath,
          pageSlug,
          sectionKey,
          query,
          { page: entry },
          pathOpts,
        ),
      };
    },
  );

  return {
    page: result.page,
    pageCount: result.pageCount,
    total: result.total,
    formAction: `${basePath}/${pageSlug}`,
    prevHref:
      result.page > 1
        ? pageSectionListPath(
            basePath,
            pageSlug,
            sectionKey,
            query,
            { page: result.page - 1 },
            pathOpts,
          )
        : undefined,
    nextHref:
      result.page < result.pageCount
        ? pageSectionListPath(
            basePath,
            pageSlug,
            sectionKey,
            query,
            { page: result.page + 1 },
            pathOpts,
          )
        : undefined,
    links,
  };
}

export { resolveGridItemStyle } from '@shamar/core';

