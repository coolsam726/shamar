export type SortDirection = 'asc' | 'desc';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'select'
  | 'relation'
  | 'email'
  | 'password'
  | 'file'
  | 'image';

export type RelationKind = 'belongsTo' | 'hasMany' | 'manyToMany';

export type ColumnSpan = number | 'full';

/** Debounce delay in ms, or a Filament-style duration string like `'750ms'`. */
export type LiveDebounce = number | `${number}ms`;

/**
 * Options for `.live({ … })`.
 */
export interface LiveOptions {
  /** Sync when the field loses focus instead of while typing. */
  onBlur?: boolean;
  /**
   * Debounce while typing (ignored when `onBlur` is true).
   * Default: `500` / `'500ms'`.
   */
  debounce?: LiveDebounce;
}

/** Live field config: `.live()` / `.live({ debounce: '750ms' })` / `.live({ onBlur: true })`. */
export type LiveMode = boolean | LiveOptions;

export type FormOperation = 'create' | 'edit' | 'view';

export interface FieldContext {
  state: unknown;
  record: Record<string, unknown> | null;
  get: (name: string) => unknown;
  set: (name: string, value: unknown) => void;
  operation: FormOperation;
}

export type StringOrClosure = string | ((ctx: FieldContext) => string);
export type BoolOrClosure = boolean | ((ctx: FieldContext) => boolean);
export type UnknownOrClosure = unknown | ((ctx: FieldContext) => unknown);

export interface RelationConfig {
  kind: RelationKind;
  resource: string;
  labelField: string;
  foreignKey?: string;
}

export interface FieldConfig {
  name: string;
  type: FieldType;
  label?: StringOrClosure;
  required?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  hiddenOnForm?: boolean;
  hiddenOnTable?: boolean;
  hiddenOnDetail?: boolean;
  readonly?: boolean;
  disabled?: BoolOrClosure;
  visible?: BoolOrClosure;
  dehydrated?: boolean;
  placeholder?: StringOrClosure;
  /** Helper text below the field (Filament `helperText`). */
  help?: StringOrClosure;
  /** Short text beside the label (Filament `hint`). */
  hint?: StringOrClosure;
  options?: Array<{ label: string; value: string | number }>;
  relation?: RelationConfig;
  createOnly?: boolean;
  default?: UnknownOrClosure;
  columnSpan?: ColumnSpan;
  columnStart?: number;
  live?: LiveMode;
  afterStateUpdated?: (ctx: FieldContext) => void | Promise<void>;
  /** Enforce uniqueness against the resource model (Filament-style). */
  unique?: boolean | UniqueOptions;
}

/**
 * Options for `.unique({ … })`.
 * Defaults to ignoring the current record on edit (`ignoreRecord: true`).
 */
export interface UniqueOptions {
  /** Column to check (defaults to the field name). */
  column?: string;
  /** Ignore the record being edited (default `true`). */
  ignoreRecord?: boolean;
  /** Custom validation message. */
  message?: string;
}

export interface ColumnConfig {
  name: string;
  type: FieldType | 'id';
  label?: string;
  searchable?: boolean;
  sortable?: boolean;
  format?: 'date' | 'datetime' | 'boolean' | 'badge' | 'toggle';
}

export interface ActionConfig {
  name: string;
  label: string;
  placement: 'header' | 'row' | 'bulk';
  color?: 'primary' | 'accent' | 'danger' | 'gray';
  icon?: string;
  confirm?: string;
  ability?: string;
}

export interface FormSection {
  name: string;
  title: string;
  description?: string;
  /**
   * Visual container:
   * - `section` — card with header (optional description + icon)
   * - `fieldset` — `<fieldset>` + legend
   * - `plain` — field grid only (no chrome); used when schema is bare fields
   */
  kind?: 'section' | 'fieldset' | 'plain';
  /** Optional icon name/key for section headers (e.g. heroicon slug or SVG path key). */
  icon?: string;
  /**
   * Elevated white card body vs transparent.
   * Defaults: `section` → true, `fieldset` → false.
   */
  card?: boolean;
  columns?: 1 | 2 | 3 | 4;
  fields: FieldConfig[];
}

export interface FormSchema {
  sections: FormSection[];
  fields: FieldConfig[];
}

export interface TableSchema {
  columns: ColumnConfig[];
  defaultSort?: { field: string; direction: SortDirection };
}

export interface InfolistEntryConfig {
  name: string;
  type: FieldType;
  label?: string;
  /** Helper text below the value (Filament `helperText`). */
  help?: string;
  /** Short text beside the label (Filament `hint`). */
  hint?: string;
  format?: 'date' | 'datetime' | 'boolean' | 'badge' | 'toggle';
  columnSpan?: ColumnSpan;
  columnStart?: number;
  hiddenOnDetail?: boolean;
}

export interface InfolistSectionConfig {
  name: string;
  title: string;
  description?: string;
  /**
   * Visual container (shared with form layouts):
   * - `section` — card with header
   * - `fieldset` — bordered legend group
   * - `plain` — entries grid only
   */
  kind?: 'section' | 'fieldset' | 'plain';
  icon?: string;
  card?: boolean;
  columns?: 1 | 2 | 3 | 4;
  entries: InfolistEntryConfig[];
}

export interface InfolistSchema {
  sections: InfolistSectionConfig[];
  entries: InfolistEntryConfig[];
}

export interface ResourceMeta {
  slug: string;
  label: string;
  singularLabel: string;
  model: ResourceModel;
  connection?: string;
  navigationGroup?: string;
  navigationSort?: number;
  recordTitleField: string;
  icon?: string;
  fields: FieldConfig[];
  form: FormSchema;
  columns: ColumnConfig[];
  infolist: InfolistSchema;
  hasExplicitInfolist: boolean;
  actions: ActionConfig[];
  searchableFields: string[];
  defaultSort?: { field: string; direction: SortDirection };
  companyScoped?: boolean;
  softDelete?: boolean | { field?: string };
}

/** Lucid/Mongoose model class or table/model name string. */
export type ResourceModel = string | (new (...args: never[]) => unknown);

export interface ListQuery {
  page: number;
  perPage: number;
  search?: string;
  sort?: string;
  direction?: SortDirection;
  scope?: Record<string, unknown>;
}

export interface PaginatedResult<T = Record<string, unknown>> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
}

export interface ShamarUser {
  id: string;
  name: string;
  email?: string;
  permissions?: string[];
  roleIds?: string[];
}

export interface DataAdapter {
  list(meta: ResourceMeta, query: ListQuery): Promise<PaginatedResult>;
  findOne(meta: ResourceMeta, id: string): Promise<Record<string, unknown>>;
  create(
    meta: ResourceMeta,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  update(
    meta: ResourceMeta,
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  delete(meta: ResourceMeta, id: string): Promise<void>;
  /**
   * Whether a row already exists for `column = value`.
   * Used by `.unique()` validation.
   */
  exists(
    meta: ResourceMeta,
    column: string,
    value: unknown,
    options?: { excludeId?: string },
  ): Promise<boolean>;
}

export interface ConnectionRegistry {
  readonly default: string;
  get(name?: string): unknown;
}

export interface PanelBranding {
  name?: string;
  logo?: string;
  logoDark?: string;
  copyright?: string;
  fontFamily?: string;
  fontUrl?: string;
  primaryColor?: string;
  accentColor?: string;
}

export type PanelOrm = 'lucid' | 'mongoose';

export interface PanelConfig {
  id: string;
  path: string;
  branding?: PanelBranding;
  orm?: PanelOrm;
  resources: Array<typeof import('./resource.js').Resource>;
  discover?: string;
}
