import type { ListQuery, PaginatedResult, ResourceMeta } from '@shamar/core';
import { formatCurrencyValue } from '@shamar/core';

export interface ListViewQuery {
  search?: string;
  sort?: string;
  direction?: string;
  perPage?: number | string;
  page?: number | string;
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

  const perPageRaw = raw.perPage;
  const wantsAll =
    perPageRaw === 'all' || String(perPageRaw).toLowerCase() === 'all';
  const perPage = wantsAll
    ? LIST_ALL_RECORDS_PER_PAGE
    : Math.min(
        LIST_ALL_RECORDS_PER_PAGE,
        Math.max(5, Number(perPageRaw) || defaults?.perPage || 15),
      );
  const page = Math.max(1, Number(raw.page) || 1);

  return {
    page,
    perPage,
    search,
    sort,
    direction: sort ? direction : undefined,
  };
}

export function buildListQueryString(
  query: ListViewQuery = {},
  overrides: ListViewQuery = {},
): string {
  const merged = { ...query, ...overrides };
  const params = new URLSearchParams();

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
    if (perPage && perPage !== 15) params.set('perPage', String(perPage));
  }

  const page = Number(merged.page);
  if (page > 1) params.set('page', String(page));

  const value = params.toString();
  return value ? `?${value}` : '';
}

export function listResourcePath(
  basePath: string,
  slug: string,
  query: ListViewQuery = {},
  overrides: ListViewQuery = {},
): string {
  return `${basePath}/${slug}${buildListQueryString(query, overrides)}`;
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
): PaginationContext {
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
        href: listResourcePath(basePath, slug, query, { page: entry }),
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
        ? listResourcePath(basePath, slug, query, { page: result.page - 1 })
        : undefined,
    nextHref:
      result.page < result.pageCount
        ? listResourcePath(basePath, slug, query, { page: result.page + 1 })
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

export function cellValue(
  record: Record<string, unknown>,
  column: {
    name: string;
    type?: string;
    format?: string;
    currency?: { code: string; locale?: string; precision?: number };
  },
): string {
  const value = record[column.name];
  if (
    column.type === 'boolean' ||
    column.format === 'boolean' ||
    column.format === 'toggle'
  ) {
    return value ? 'Yes' : 'No';
  }
  if (value == null || value === '') return '—';

  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean).join(', ') || '—';
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
  const value = record[field.name];
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

/** Parse Date, ISO strings, YYYY-MM-DD, epoch ms, and Luxon-like objects. */
export function parseDateValue(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Date-only: keep calendar day stable across timezones.
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (dateOnly) {
      const date = new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
      );
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (value && typeof value === 'object') {
    const object = value as {
      toJSDate?: () => Date;
      toISO?: () => string | null;
      toISOString?: () => string;
    };
    if (typeof object.toJSDate === 'function') {
      return parseDateValue(object.toJSDate());
    }
    if (typeof object.toISO === 'function') {
      return parseDateValue(object.toISO());
    }
    if (typeof object.toISOString === 'function') {
      return parseDateValue(object.toISOString());
    }
  }

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

/**
 * Normalize stored dates for native `date` / `datetime-local` inputs (local calendar).
 */
export function toFormDateInputValue(
  value: unknown,
  mode: 'date' | 'datetime',
): string {
  const date = parseDateValue(value);
  if (!date) return '';

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  if (mode === 'date') return `${y}-${m}-${d}`;

  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

/** Coerce adapter values into form-control-friendly state. */
export function toFormControlValue(
  value: unknown,
  field: { type: string; currency?: { precision?: number } },
): unknown {
  if (field.type === 'date') return toFormDateInputValue(value, 'date');
  if (field.type === 'datetime') return toFormDateInputValue(value, 'datetime');
  if (field.type === 'number' || field.currency) {
    if (value == null || value === '') return '';
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : value;
  }
  if (field.type === 'color' && (value == null || value === '')) {
    return '#000000';
  }
  if (field.type === 'select' && (field as { multiple?: boolean }).multiple) {
    if (Array.isArray(value)) return value.map((item) => String(item));
    if (value == null || value === '') return [];
    return [String(value)];
  }
  return value;
}

/** Parse currency-ish user input into a finite number (or empty string). */
export function parseCurrencyInput(value: unknown): number | '' {
  if (value == null || value === '') return '';
  if (typeof value === 'number') return Number.isFinite(value) ? value : '';
  const cleaned = String(value).replace(/[^\d.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.') return '';
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : '';
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
      return 'url';
    case 'date':
      return 'date';
    case 'datetime':
      return 'datetime-local';
    case 'color':
      return 'color';
    case 'hidden':
      return 'hidden';
    case 'file':
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


export { resolveGridItemStyle } from '@shamar/core';

