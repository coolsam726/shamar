import { defaultActions } from './actions.js';
import { form, FormBuilder } from './form.js';
import { infolist, formSchemaToInfolistSchema, InfolistBuilder } from './infolist.js';
import { userHasPermission, normalizeCustomPermissions } from './permissions.js';
import type { PolicyClass } from './policy-types.js';
import { table, TableBuilder } from './table.js';
import type { DataAdapter, ResourceMeta, ResourceModel, ShamarUser } from './types.js';

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
  static navigationSort?: number;
  static recordTitleField = 'name';
  static icon?: string;
  static companyScoped?: boolean;
  static softDelete?: boolean | { field?: string };
  /**
   * Max width of create/edit and show/infolist content.
   * Overrides panel `contentMaxWidth` when set.
   * Tailwind token (`3xl`, `5xl`, `7xl`, `full`, `none`) or CSS length (`80rem`).
   */
  static contentMaxWidth?: string;
  /** Optional record-level policy (Loom / Laravel style). */
  static policy?: PolicyClass;

  static form(): ReturnType<typeof form> {
    return form(() => undefined);
  }

  static table(): ReturnType<typeof table> {
    return table(() => undefined);
  }

  /**
   * Detail/infolist schema. When not overridden, derived from form fields.
   * Alias: `detail()`.
   */
  static infolist(): ReturnType<typeof infolist> | undefined {
    return undefined;
  }

  /** Alias for `infolist()` (Filament naming). */
  static detail(): ReturnType<typeof infolist> | undefined {
    return this.infolist();
  }

  static resourceActions(): ReturnType<typeof defaultActions> {
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
    const formSchema = this.form();
    const tableSchema = this.table();
    const actionList = this.resourceActions();
    const explicitInfolist = this.infolist() ?? this.detail();
    const hasExplicitInfolist = explicitInfolist !== undefined;
    const infolistSchema = explicitInfolist ?? formSchemaToInfolistSchema(formSchema);

    const searchableFields = [
      ...formSchema.fields.filter((f) => f.searchable).map((f) => f.name),
      ...tableSchema.columns.filter((c) => c.searchable).map((c) => c.name),
    ];

    return {
      slug: this.slug,
      label: this.label,
      singularLabel: this.singularLabel,
      model: this.model,
      connection: this.connection,
      navigationGroup: this.navigationGroup,
      navigationSort: this.navigationSort,
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

    static override form() {
      if (!overrides.form) return Base.form();
      return form(overrides.form);
    }

    static override table() {
      if (!overrides.table) return Base.table();
      return table(overrides.table);
    }

    static override infolist() {
      if (!overrides.infolist) return Base.infolist();
      return infolist(overrides.infolist);
    }
  };
}
