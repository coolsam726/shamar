import { acceptActions, ActionBuilder, defaultActions } from './actions.js';
import { acceptForm, FormBuilder } from './form.js';
import { acceptInfolist, formSchemaToInfolistSchema, InfolistBuilder } from './infolist.js';
import { userHasPermission, normalizeCustomPermissions } from './permissions.js';
import type { PolicyClass } from './policy-types.js';
import { acceptTable, TableBuilder } from './table.js';
import type {
  ActionConfig,
  DataAdapter,
  FormSchema,
  InfolistSchema,
  ResourceMeta,
  ResourceModel,
  ResourcePageMode,
  ShamarUser,
  TableSchema,
} from './types.js';

/** Result of {@link Resource.prepareCreate} before adapter.create. */
export interface PrepareCreateResult {
  data: Record<string, unknown>;
  /** One-time secret to flash after create (e.g. API key plaintext). */
  flashPlainText?: string;
  /** Override success flash message. */
  flashMessage?: string;
}

export interface PrepareCreateContext {
  adapter: DataAdapter;
  meta: ResourceMeta;
  /** Authenticated user id when available (audit). */
  userId?: string | null;
}

export interface HandleActionContext {
  adapter: DataAdapter;
  meta: ResourceMeta;
  userId?: string | null;
  user?: ShamarUser | null;
}

export interface HandleActionResult {
  message?: string;
  /**
   * Also push a panel notification (topbar bell) for the current session.
   * `true` uses `message` as the title; pass `{ title, body }` to customize.
   */
  notification?: boolean | { title?: string; body?: string };
}

/**
 * Base resource class — Filament `Resource` equivalent.
 *
 * Override `form`, `table`, and optionally `infolist` / `detail`.
 */
export abstract class Resource {
  static slug = 'resources';
  static label = 'Resources';
  static singularLabel = 'Resource';
  static model: ResourceModel = 'Resource';
  static connection?: string;
  static navigationGroup?: string;
  /**
   * Cluster resources under a dropdown inside the active navigation group
   * (Shamar top-bar secondary menu). Leave unset for a direct top-bar link.
   */
  static navigationSubGroup?: string;
  static navigationSort?: number;
  /** When true, omit from panel navigation (CRUD routes remain). */
  static navigationHidden?: boolean;
  static recordTitleField = 'name';
  static icon?: string;
  static companyScoped?: boolean;
  static softDelete?: boolean | { field?: string };
  /**
   * Max width of create/edit and show/infolist content.
   * Overrides panel `contentMaxWidth` when set.
   * Prefer screen tokens (`screen-lg`, `screen-xl`, `screen-2xl`) or a scale/CSS length.
   */
  static contentMaxWidth?: string;
  /**
   * Default list page size when the request omits `perPage`.
   * Overrides panel `defaultPerPage` when set. Built-in default: `15`.
   */
  static defaultPerPage?: number;
  /**
   * When true, create / edit / view open in a modal over the list (quick actions).
   * Override individual operations with `createMode` / `editMode` / `viewMode`.
   */
  static quickActions?: boolean;
  /** Create from the list: full page (default) or modal. */
  static createMode?: ResourcePageMode;
  /** Edit from the list / show: full page (default) or modal. */
  static editMode?: ResourcePageMode;
  /** View / row click: full page (default) or modal. */
  static viewMode?: ResourcePageMode;
  /** Optional record-level policy (Loom / Laravel style). */
  static policy?: PolicyClass;
  /**
   * When true (default), consecutive RelationTable sections on form/infolist
   * schemas are rendered as Tabs (Filament relation-manager style).
   */
  static relationTablesAsTabs = true;

  /**
   * Create/edit fields. Chain on the builder Filament passes in:
   * `return form.schema([...])`.
   */
  static form(form: FormBuilder): FormBuilder | FormSchema {
    return form;
  }

  /** List columns. `return table.schema([...]).defaultSort('name')`. */
  static table(table: TableBuilder): TableBuilder | TableSchema {
    return table;
  }

  /**
   * Detail/infolist schema. When not overridden, derived from form fields.
   * Alias: `detail()`.
   */
  static infolist(
    _infolist: InfolistBuilder,
  ): InfolistBuilder | InfolistSchema | undefined {
    return undefined;
  }

  /** Alias for `infolist()` (Filament naming). */
  static detail(
    infolist: InfolistBuilder,
  ): InfolistBuilder | InfolistSchema | undefined {
    return this.infolist(infolist);
  }

  /** Header, row, and bulk actions. Call methods on `actions`, then return it. */
  static resourceActions(
    _actions: ActionBuilder,
  ): ActionBuilder | ActionConfig[] {
    return defaultActions();
  }

  /**
   * Extra abilities beyond CRUD (`viewAny` / `view` / `create` / `edit` / `delete`).
   * Seeded as `{slug}:{ability}` unless the name already contains `:`.
   */
  static permissions(): Array<string | { name: string; label?: string }> {
    return [];
  }

  /**
   * Mutate create payload before validation / adapter.create.
   * Return `flashPlainText` for one-time secrets (API keys).
   */
  static prepareCreate(
    data: Record<string, unknown>,
    _ctx: PrepareCreateContext,
  ): PrepareCreateResult | Promise<PrepareCreateResult> {
    return { data };
  }

  /**
   * Handle a named custom action (`placement: 'row' | 'bulk'`) for one or more records.
   * Return `null`/`undefined` when the action is unknown so the controller can 400.
   */
  static handleAction(
    _action: string,
    _records: Record<string, unknown>[],
    _ctx: HandleActionContext,
  ):
    | HandleActionResult
    | void
    | null
    | Promise<HandleActionResult | void | null> {
    return null;
  }

  /** Whether the resource appears in navigation and is reachable. */
  static canAccess(user: ShamarUser): boolean {
    return this.canViewAny(user);
  }

  static canViewAny(user: ShamarUser): boolean {
    if (this.policy?.viewAny) return Boolean(this.policy.viewAny(user, this.slug));
    return userHasPermission(user, this.slug, 'viewAny');
  }

  static canView(user: ShamarUser, record?: Record<string, unknown>): boolean {
    if (this.policy?.view) return Boolean(this.policy.view(user, record ?? {}, this.slug));
    return userHasPermission(user, this.slug, 'view');
  }

  static canCreate(user: ShamarUser): boolean {
    if (this.policy?.create) return Boolean(this.policy.create(user, this.slug));
    return userHasPermission(user, this.slug, 'create');
  }

  static canEdit(user: ShamarUser, record?: Record<string, unknown>): boolean {
    if (this.policy?.edit) return Boolean(this.policy.edit(user, record ?? {}, this.slug));
    return userHasPermission(user, this.slug, 'edit');
  }

  static canDelete(user: ShamarUser, record?: Record<string, unknown>): boolean {
    if (this.policy?.delete) return Boolean(this.policy.delete(user, record ?? {}, this.slug));
    return userHasPermission(user, this.slug, 'delete');
  }

  static configure(): ResourceMeta {
    const asTabs = this.relationTablesAsTabs !== false;
    const formBuilder = new FormBuilder().relationTablesAsTabs(asTabs);
    const formSchema = acceptForm(this.form(formBuilder), formBuilder);
    const tableBuilder = new TableBuilder();
    const tableSchema = acceptTable(this.table(tableBuilder), tableBuilder);
    const actionBuilder = new ActionBuilder();
    const actionList = acceptActions(this.resourceActions(actionBuilder), actionBuilder);
    const infolistBuilder = new InfolistBuilder().relationTablesAsTabs(asTabs);
    let explicitInfolist = acceptInfolist(this.infolist(infolistBuilder));
    if (!explicitInfolist) {
      const detailBuilder = new InfolistBuilder().relationTablesAsTabs(asTabs);
      explicitInfolist = acceptInfolist(this.detail(detailBuilder));
    }
    const hasExplicitInfolist = explicitInfolist !== undefined;
    const infolistSchema = explicitInfolist ?? formSchemaToInfolistSchema(formSchema);

    const searchableFields = [
      ...formSchema.fields.filter((f) => f.searchable).map((f) => f.name),
      ...tableSchema.columns.filter((c) => c.searchable).map((c) => c.name),
    ];

    const defaultMode: ResourcePageMode = this.quickActions ? 'modal' : 'page';

    return {
      slug: this.slug,
      label: this.label,
      singularLabel: this.singularLabel,
      model: this.model,
      connection: this.connection,
      navigationGroup: this.navigationGroup,
      navigationSubGroup: this.navigationSubGroup,
      navigationSort: this.navigationSort,
      navigationHidden: this.navigationHidden,
      recordTitleField: this.recordTitleField,
      icon: this.icon,
      fields: formSchema.fields,
      form: formSchema,
      columns: tableSchema.columns,
      infolist: infolistSchema,
      hasExplicitInfolist,
      actions: actionList,
      searchableFields: [...new Set(searchableFields)],
      defaultSort: tableSchema.defaultSort,
      defaultFilters: tableSchema.defaultFilters,
      defaultGroupBy: tableSchema.defaultGroupBy,
      companyScoped: this.companyScoped,
      softDelete: this.softDelete,
      customPermissions: normalizeCustomPermissions(this.slug, this.permissions()),
      contentMaxWidth: this.contentMaxWidth,
      defaultPerPage: this.defaultPerPage,
      createMode: this.createMode ?? defaultMode,
      editMode: this.editMode ?? defaultMode,
      viewMode: this.viewMode ?? defaultMode,
    };
  }

  static recordTitle(record: Record<string, unknown>): string {
    const field = this.recordTitleField;
    const value = record[field];
    if (value != null && value !== '') return String(value);
    const id = record.id ?? record._id;
    return id != null ? `#${id}` : 'Record';
  }
}

export function extendResource<Base extends typeof Resource>(
  Base: Base,
  overrides: {
    slug?: string;
    label?: string;
    singularLabel?: string;
    model?: ResourceModel;
    connection?: string;
    navigationGroup?: string;
    form?: (builder: FormBuilder) => void;
    table?: (builder: TableBuilder) => void;
    infolist?: (builder: InfolistBuilder) => void;
  },
): typeof Resource {
  return class ExtendedResource extends Resource {
    static override slug = overrides.slug ?? Base.slug;
    static override label = overrides.label ?? Base.label;
    static override singularLabel = overrides.singularLabel ?? Base.singularLabel;
    static override model = overrides.model ?? Base.model;
    static override connection = overrides.connection ?? Base.connection;
    static override navigationGroup =
      overrides.navigationGroup ?? Base.navigationGroup;

    static override form(form: FormBuilder) {
      if (!overrides.form) return Base.form(form);
      overrides.form(form);
      return form;
    }

    static override table(table: TableBuilder) {
      if (!overrides.table) return Base.table(table);
      overrides.table(table);
      return table;
    }

    static override infolist(infolist: InfolistBuilder) {
      if (!overrides.infolist) return Base.infolist(infolist);
      overrides.infolist(infolist);
      return infolist;
    }
  };
}
