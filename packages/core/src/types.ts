export type SortDirection = 'asc' | 'desc';

export type { CurrencyOptions } from './currency.js';
export type { Alignment, VerticalAlignment } from './alignment.js';
import type { CurrencyOptions } from './currency.js';
import type { Alignment, VerticalAlignment } from './alignment.js';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'checkbox'
  | 'date'
  | 'datetime'
  | 'select'
  | 'relation'
  | 'email'
  | 'password'
  | 'tel'
  | 'url'
  | 'file'
  | 'image'
  | 'hidden'
  | 'radio'
  | 'color'
  | 'tags'
  | 'checkboxList'
  | 'relationTable';

export type RelationKind = 'belongsTo' | 'hasMany' | 'manyToMany';

/** UI widget for a relationship field. */
export type RelationWidget = 'combobox' | 'radio' | 'checkboxList' | 'table';

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
  /** Related resource slug (e.g. `companies`). */
  resource: string;
  /** Column used for option labels (Filament `titleAttribute`). */
  labelField: string;
  /** Alias of `labelField` (Filament naming). */
  titleAttribute?: string;
  /** Child FK for hasMany (e.g. `companyId`). */
  foreignKey?: string;
  /** Presentation widget (defaults by kind). */
  widget?: RelationWidget;
  /** Inline quick-create from search query (PyVELM/Loom Create). */
  createOption?: boolean;
  /** Open related create form in a dialog, then pick (Create & Edit). */
  createAndEditOption?: boolean;
  /** Optional create modal schema override (falls back to related resource create URL). */
  createOptionForm?: FieldConfig[];
  /** Initial option load size for radio / checkbox list. */
  preloadLimit?: number;
  /** Checkbox list: group options by this related field (e.g. `resource`). */
  groupBy?: string;
  checkboxColumns?: number;
  checkboxFramed?: boolean;
  cascadeWildcards?: boolean;
  /**
   * Attribute used as the dehydrated form value (default `id`).
   * Set to `name` for ability pickers that store permission keys.
   */
  valueAttribute?: string;
}

export interface FieldConfig {
  name: string;
  type: FieldType;
  label?: StringOrClosure;
  /** Static or reactive required (Filament-style closure). */
  required?: BoolOrClosure;
  searchable?: boolean;
  sortable?: boolean;
  hiddenOnForm?: boolean;
  hiddenOnTable?: boolean;
  hiddenOnDetail?: boolean;
  /** Static or reactive readonly. */
  readonly?: BoolOrClosure;
  disabled?: BoolOrClosure;
  visible?: BoolOrClosure;
  dehydrated?: boolean;
  placeholder?: StringOrClosure;
  /** Helper text below the field (Filament `helperText`). */
  help?: StringOrClosure;
  /** Short text beside the label (Filament `hint`). */
  hint?: StringOrClosure;
  options?: Array<{ label: string; value: string | number }>;
  checkboxColumns?: number;
  checkboxFramed?: boolean;
  cascadeWildcards?: boolean;
  groupBy?: string;
  relation?: RelationConfig;
  createOnly?: boolean;
  default?: UnknownOrClosure;
  columnSpan?: ColumnSpan;
  columnStart?: number;
  live?: LiveMode;
  afterStateUpdated?: (ctx: FieldContext) => void | Promise<void>;
  /** Enforce uniqueness against the resource model (Filament-style). */
  unique?: boolean | UniqueOptions;
  /** Textarea row count. */
  rows?: number;
  /** Toggle/checkbox/radio inline layout. */
  inline?: boolean;
  /** Text input affixes. */
  prefix?: string;
  suffix?: string;
  /**
   * When true (default), prefix sits inside the input border.
   * When false, prefix renders beside/outside the control.
   */
  inlinePrefix?: boolean;
  /**
   * When true (default), suffix sits inside the input border.
   * When false, suffix renders beside/outside the control.
   */
  inlineSuffix?: boolean;
  /** Affix icons (heroicon-style slug or short glyph). */
  prefixIcon?: string;
  suffixIcon?: string;
  /**
   * Currency formatting for numeric inputs (Intl).
   * Stored value remains numeric; UI formats for display.
   */
  currency?: CurrencyOptions;
  /** Multi-select. */
  multiple?: boolean;
  /** Native autocomplete attribute. */
  autocomplete?: string;
  /** Native inputmode attribute. */
  inputMode?: string;
  /** Exact / min / max string length (Filament length helpers). */
  length?: number;
  minLength?: number;
  maxLength?: number;
  /** Numeric / date bounds (maps to min/max). */
  minValue?: number | string;
  maxValue?: number | string;
  step?: number | string;
  /** Regex pattern (HTML pattern + server check). */
  pattern?: string;
  /** Password reveal toggle (Filament `revealable()`). */
  revealable?: boolean;
  /** Copy-to-clipboard control beside the input. */
  copyable?: boolean;
  /** `<datalist>` suggestions. */
  datalist?: string[];
  /**
   * Select: whether the empty placeholder option stays selectable.
   * Default `true`. When `false`, the blank option is omitted.
   */
  selectablePlaceholder?: boolean;
  /**
   * Select: use a native `<select>` instead of the Shamar combobox.
   * Default `false` (combobox).
   */
  nativeSelect?: boolean;
  /** Extra native attributes on the control. */
  extraInputAttributes?: Record<string, string>;
  /** File input accept filter (e.g. `image/*`). */
  accept?: string;
  /** Horizontal alignment of the field control (Filament-style). */
  alignment?: Alignment;
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
  format?: 'date' | 'datetime' | 'boolean' | 'badge' | 'toggle' | 'currency';
  /** Currency display options when `format` is `currency`. */
  currency?: CurrencyOptions;
  /** Horizontal alignment (Filament `alignStart` / `alignEnd` / …). */
  alignment?: Alignment;
  /** Vertical alignment (Filament `verticallyAlignStart` / …). */
  verticalAlignment?: VerticalAlignment;
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
  collapsible?: boolean;
  collapsed?: boolean;
  dense?: boolean;
  gap?: boolean;
  extraAttributes?: Record<string, string>;
}

export interface FormSchema {
  /** Nested Filament-style schema tree (preferred for rendering). */
  schema: SchemaNode[];
  /** Legacy flat containers derived from root layout nodes. */
  sections: FormSection[];
  /** Flat field list for state, validation, and payloads. */
  fields: FieldConfig[];
}

export interface TableSchema {
  columns: ColumnConfig[];
  defaultSort?: { field: string; direction: SortDirection };
}

export interface InfolistEntryConfig {
  name: string;
  type: FieldType | 'icon' | 'color' | 'image';
  label?: string;
  /** Helper text below the value (Filament `helperText`). */
  help?: string;
  /** Short text beside the label (Filament `hint`). */
  hint?: string;
  format?: 'date' | 'datetime' | 'boolean' | 'badge' | 'toggle' | 'markdown' | 'currency';
  columnSpan?: ColumnSpan;
  columnStart?: number;
  hiddenOnDetail?: boolean;
  url?: boolean | string;
  copyable?: boolean;
  /** True icon name when value is truthy (IconEntry). */
  icon?: string;
  falseIcon?: string;
  /** Currency display options when `format` is `currency`. */
  currency?: CurrencyOptions;
  /** Horizontal alignment of the entry value. */
  alignment?: Alignment;
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
  collapsible?: boolean;
  collapsed?: boolean;
  dense?: boolean;
  gap?: boolean;
  extraAttributes?: Record<string, string>;
}

export interface InfolistSchema {
  /** Nested Filament-style schema tree (preferred for rendering). */
  schema: SchemaNode[];
  sections: InfolistSectionConfig[];
  entries: InfolistEntryConfig[];
}

/** Filament 5 shared schema node (layout + leaves). */
export type SchemaNodeKind =
  | 'section'
  | 'fieldset'
  | 'grid'
  | 'group'
  | 'flex'
  | 'tabs'
  | 'tab'
  | 'wizard'
  | 'step'
  | 'callout'
  | 'empty_state'
  | 'placeholder'
  | 'plain'
  | 'field'
  | 'entry';

export type CalloutStatus = 'info' | 'success' | 'warning' | 'danger';

export interface SchemaNode {
  kind: SchemaNodeKind;
  name?: string;
  title?: string;
  description?: string;
  icon?: string;
  card?: boolean;
  columns?: 1 | 2 | 3 | 4;
  dense?: boolean;
  /** When false, remove gap between children. */
  gap?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  /** Flex: grow to fill space (default true). */
  grow?: boolean;
  /** Flex: horizontal split from this Tailwind breakpoint. */
  from?: string;
  /** Callout status. */
  status?: CalloutStatus;
  /** Tabs: 1-based active tab index. */
  activeTab?: number;
  vertical?: boolean;
  /** Placeholder / callout body text. */
  content?: string;
  badge?: string | number;
  columnSpan?: ColumnSpan;
  columnStart?: number;
  extraAttributes?: Record<string, string>;
  field?: FieldConfig;
  entry?: InfolistEntryConfig;
  children?: SchemaNode[];
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
  /** Extra permission names declared by `Resource.permissions()`. */
  customPermissions?: Array<{ name: string; label?: string }>;
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
  /** Resolved role slugs (populated at runtime). */
  roles?: string[];
}

/** Options for relation option search / label resolution. */
export interface RelationSearchQuery {
  /** Free-text search against the title attribute. */
  q?: string;
  /** Max results (default 25). */
  limit?: number;
  /** Resolve labels for specific ids (edit/show). */
  ids?: string[];
  /** Equality scope filters (e.g. hasMany `{ companyId: parentId }`). */
  scope?: Record<string, unknown>;
  /** Column used for labels. */
  titleAttribute: string;
}

export interface RelationSearchResult {
  id: string;
  label: string;
  /** Full permission key, e.g. `products:viewAny` or `*`. */
  name?: string;
  /** Checkbox list grouping (e.g. permission resource slug). */
  group?: string;
  ability?: string;
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
  /**
   * Search related records for relation fields (BelongsTo / M2M / HasMany widgets).
   */
  search(
    meta: ResourceMeta,
    query: RelationSearchQuery,
  ): Promise<RelationSearchResult[]>;
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
