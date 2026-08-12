import { form } from './form.js';
import { infolist, columnsToInfolistSchema } from './infolist.js';
import { table } from './table.js';
import type { PageSectionDefinition, PageSectionMeta } from './page-content.js';
import type {
  ActionConfig,
  FieldConfig,
  FormSchema,
  ResourceMeta,
  ResourceModel,
  ShamarUser,
} from './types.js';

export type PageKind = 'custom' | 'form' | 'list' | 'composite';

/** Minimal request context passed into page lifecycle hooks. */
export interface PageRequestContext {
  user?: ShamarUser | null;
  panelId?: string;
  /** Raw request body / query bag when available. */
  input?: Record<string, unknown>;
}

export interface PageSaveResult {
  message?: string;
  /** Redirect path after save (absolute or panel-relative). */
  redirectTo?: string;
}

export interface PageActionResult {
  message?: string;
  redirectTo?: string;
}

/**
 * Configured page metadata for routing, nav, and rendering.
 */
export interface PageMeta {
  kind: PageKind;
  slug: string;
  label: string;
  navigationGroup?: string;
  navigationSubGroup?: string;
  navigationSort?: number;
  navigationHidden?: boolean;
  icon?: string;
  /** Edge view override (defaults by kind). */
  view?: string;
  contentMaxWidth?: string;
  defaultPerPage?: number;
  actions: ActionConfig[];
  /** Form schema when kind is `form`. */
  form?: FormSchema;
  fields?: FieldConfig[];
  /**
   * Resource-shaped meta for list pages so adapter.list + index UI can be reused.
   * Only set when kind is `list`.
   */
  listResource?: ResourceMeta;
  /** Declarative sections when kind is `composite`. */
  sections?: PageSectionMeta[];
}

/**
 * Filament-style panel page — custom view, declarative sections, or header actions.
 * Use {@link FormPage} or {@link ListPage} for a single form or table shortcut.
 */
export abstract class Page {
  static slug = 'page';
  static label = 'Page';
  static navigationGroup?: string;
  static navigationSubGroup?: string;
  static navigationSort?: number;
  static navigationHidden?: boolean;
  static icon?: string;
  /** Edge view name (e.g. `pages/welcome`). Defaults to `shamar::page`. */
  static view?: string;
  static contentMaxWidth?: string;

  static canAccess(_user: ShamarUser | null | undefined): boolean {
    return true;
  }

  static headerActions(): ActionConfig[] {
    return [];
  }

  /**
   * Extra locals for the page view (merged after fill for form pages).
   */
  static mount(
    _ctx: PageRequestContext,
  ): Record<string, unknown> | Promise<Record<string, unknown>> {
    return {};
  }

  static handleAction(
    _name: string,
    _ctx: PageRequestContext,
  ): PageActionResult | null | undefined | Promise<PageActionResult | null | undefined> {
    return null;
  }

  /**
   * Declarative sections (forms, tables, infolists, Edge blocks).
   * When non-empty, the page renders as a composite layout (`shamar::page-sections`).
   */
  static content(): PageSectionDefinition[] {
    return [];
  }

  static configure(): PageMeta {
    const definitions = this.content();
    if (definitions.length > 0) {
      const sections = definitions.map((section) => {
        const meta = { ...section.meta };
        if (meta.kind === 'infolist' && meta.infolistResource) {
          meta.infolistResource = {
            ...meta.infolistResource,
            slug: `${this.slug}__${meta.key}`,
          };
        }
        return meta;
      });

      return {
        kind: 'composite',
        slug: this.slug,
        label: this.label,
        navigationGroup: this.navigationGroup,
        navigationSubGroup: this.navigationSubGroup,
        navigationSort: this.navigationSort,
        navigationHidden: this.navigationHidden,
        icon: this.icon,
        view: this.view ?? 'shamar::page-sections',
        contentMaxWidth: this.contentMaxWidth,
        actions: this.headerActions(),
        sections,
      };
    }

    return {
      kind: 'custom',
      slug: this.slug,
      label: this.label,
      navigationGroup: this.navigationGroup,
      navigationSubGroup: this.navigationSubGroup,
      navigationSort: this.navigationSort,
      navigationHidden: this.navigationHidden,
      icon: this.icon,
      view: this.view,
      contentMaxWidth: this.contentMaxWidth,
      actions: this.headerActions(),
    };
  }
}

/**
 * Filament-style settings / form page — mount/fill data, save on POST.
 */
export abstract class FormPage extends Page {
  static form(): ReturnType<typeof form> {
    return form(() => undefined);
  }

  /**
   * Initial form state. Defaults to `{}`; override to load a singleton / settings row.
   */
  static fill(
    _ctx: PageRequestContext,
  ): Record<string, unknown> | Promise<Record<string, unknown>> {
    return {};
  }

  /**
   * Persist form data. Required for useful form pages.
   */
  static save(
    _data: Record<string, unknown>,
    _ctx: PageRequestContext,
  ): PageSaveResult | void | Promise<PageSaveResult | void> {
    return undefined;
  }

  static override configure(): PageMeta {
    const formSchema = this.form();
    return {
      ...super.configure(),
      kind: 'form',
      form: formSchema,
      fields: formSchema.fields,
      view: this.view ?? 'shamar::page-form',
    };
  }
}

/**
 * Canonical singleton settings page for panels (branding, prefs, app config).
 * Same API as {@link FormPage}; defaults to a `7xl` content column so every
 * project’s settings screen shares one layout.
 */
export abstract class SettingsPage extends FormPage {
  static override contentMaxWidth = '7xl';
  static override view = 'shamar::page-form';
}

/**
 * Standalone list page — reuses Resource table builders + list UI without full CRUD routes.
 */
export abstract class ListPage extends Page {
  static model: ResourceModel = 'Record';
  static connection?: string;
  static recordTitleField = 'name';
  static softDelete?: boolean | { field?: string };
  static defaultPerPage?: number;

  static table(): ReturnType<typeof table> {
    return table(() => undefined);
  }

  /**
   * Optional show/infolist for row clicks (`GET /:slug/:id`).
   * Defaults to entries derived from {@link table} columns.
   */
  static infolist(): ReturnType<typeof infolist> | undefined {
    return undefined;
  }

  static listActions(): ActionConfig[] {
    // Read-only list by default — no create/edit/delete chrome.
    return [];
  }

  static override configure(): PageMeta {
    const tableSchema = this.table();
    const actionList = this.listActions();
    const explicitInfolist = this.infolist();
    const infolistSchema = explicitInfolist ?? columnsToInfolistSchema(tableSchema.columns);

    const searchableFields = tableSchema.columns
      .filter((column) => column.searchable)
      .map((column) => column.name);

    const listResource: ResourceMeta = {
      slug: this.slug,
      label: this.label,
      singularLabel: this.label,
      model: this.model,
      connection: this.connection,
      navigationGroup: this.navigationGroup,
      navigationSubGroup: this.navigationSubGroup,
      navigationSort: this.navigationSort,
      recordTitleField: this.recordTitleField,
      icon: this.icon,
      fields: [],
      form: { fields: [], sections: [], schema: [] },
      columns: tableSchema.columns,
      infolist: infolistSchema,
      hasExplicitInfolist: explicitInfolist !== undefined,
      actions: actionList,
      searchableFields: [...new Set(searchableFields)],
      defaultSort: tableSchema.defaultSort,
      defaultFilters: tableSchema.defaultFilters,
      defaultGroupBy: tableSchema.defaultGroupBy,
      softDelete: this.softDelete,
      contentMaxWidth: this.contentMaxWidth,
      defaultPerPage: this.defaultPerPage,
    };

    return {
      ...super.configure(),
      kind: 'list',
      defaultPerPage: this.defaultPerPage,
      actions: [...this.headerActions(), ...actionList.filter((a) => a.placement === 'header')],
      view: this.view ?? 'shamar::page-list',
      listResource,
    };
  }
}

export type PageClass = typeof Page;

/** True when `value` is FormPage or a subclass (including {@link SettingsPage}). */
export function isFormPage(value: PageClass): value is typeof FormPage {
  let current: unknown = value;
  while (typeof current === 'function') {
    if (current === FormPage || current === SettingsPage) return true;
    current = Object.getPrototypeOf(current);
  }
  return false;
}

/** True when `value` is SettingsPage or a subclass. */
export function isSettingsPage(value: PageClass): value is typeof SettingsPage {
  let current: unknown = value;
  while (typeof current === 'function') {
    if (current === SettingsPage) return true;
    current = Object.getPrototypeOf(current);
  }
  return false;
}

export function isListPage(value: PageClass): value is typeof ListPage {
  let current: unknown = value;
  while (typeof current === 'function') {
    if (current === ListPage) return true;
    current = Object.getPrototypeOf(current);
  }
  return false;
}

/** True when the page declares one or more {@link Page.content} sections. */
export function hasPageSections(value: PageClass): boolean {
  return value.content().length > 0;
}
