import { defaultActions } from './actions.js';
import { form, FormBuilder } from './form.js';
import { infolist, infolistFromFields, InfolistBuilder } from './infolist.js';
import { table, TableBuilder } from './table.js';
import type { ResourceMeta, ResourceModel, ShamarUser } from './types.js';

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

  static canViewAny(_user: ShamarUser): boolean {
    return true;
  }

  static canCreate(_user: ShamarUser): boolean {
    return true;
  }

  static canEdit(_user: ShamarUser, _record?: Record<string, unknown>): boolean {
    return true;
  }

  static canDelete(_user: ShamarUser, _record?: Record<string, unknown>): boolean {
    return true;
  }

  static configure(): ResourceMeta {
    const formSchema = this.form();
    const tableSchema = this.table();
    const actionList = this.resourceActions();
    const explicitInfolist = this.infolist() ?? this.detail();
    const hasExplicitInfolist = explicitInfolist !== undefined;
    const infolistSchema = explicitInfolist ?? infolistFromFields(formSchema.fields);

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
      companyScoped: this.companyScoped,
      softDelete: this.softDelete,
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
