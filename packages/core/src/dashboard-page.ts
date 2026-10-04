import { Page } from './page.js';
import { FormBuilder, acceptForm } from './form.js';
import { NavigationCardsWidget } from './widgets/navigation-cards-widget.js';
import type { WidgetClass } from './widget.js';
import type { FormSchema, SchemaNode } from './types.js';

/** Reserved slug — dashboard pages are not registered as `/:slug` routes. */
export const DASHBOARD_PAGE_SLUG = '__dashboard__';

/**
 * Panel home dashboard. Override {@link widgets} and register via
 * `panel('admin').dashboardPage(MyDashboard)`.
 */
export abstract class DashboardPage extends Page {
  static override slug = DASHBOARD_PAGE_SLUG;
  static override label = 'Dashboard';
  static override navigationHidden = true;

  /** Responsive grid columns for widget layout (1–4). */
  static columns = 3;

  static widgets(): WidgetClass[] {
    return [NavigationCardsWidget];
  }

  /**
   * Optional filters form (Filament `HasFiltersForm` / `getFiltersForm`).
   * Submitted via GET on the dashboard; values land in `WidgetRequestContext.filters`.
   *
   * @example
   * ```ts
   * static override filtersForm(form: FormBuilder) {
   *   return form.schema([
   *     Select.make('period').options([
   *       { label: 'Today', value: 'today' },
   *       { label: 'MTD', value: 'mtd' },
   *     ]).default('today'),
   *   ])
   * }
   * ```
   */
  static filtersForm(_form: FormBuilder): FormBuilder | FormSchema | void {
    return undefined;
  }
}

export type DashboardPageClass = typeof DashboardPage;

/** True when `value` is DashboardPage or a subclass. */
export function isDashboardPage(value: unknown): value is DashboardPageClass {
  if (typeof value !== 'function') return false;
  let current: unknown = value;
  while (typeof current === 'function') {
    if (current === DashboardPage) return true;
    current = Object.getPrototypeOf(current);
  }
  return false;
}

/** Resolve the optional filters form schema for a dashboard page. */
export function resolveDashboardFiltersForm(
  DashboardClass: DashboardPageClass,
): FormSchema | undefined {
  const builder = new FormBuilder();
  const result = DashboardClass.filtersForm(builder);
  if (result === undefined) return undefined;
  const built = acceptForm(result, builder);
  return built.fields.length || built.schema?.length ? built : undefined;
}

/** Flatten filter field names from a filters form schema. */
export function dashboardFilterFieldNames(schema: FormSchema | undefined): string[] {
  if (!schema) return [];
  return schema.fields.map((field) => field.name);
}

/** Collect filter values from a query/body bag for known filter fields. */
export function pickDashboardFilters(
  source: Record<string, unknown>,
  schema: FormSchema | undefined,
): Record<string, unknown> {
  const names = dashboardFilterFieldNames(schema);
  if (!names.length) return {};
  const out: Record<string, unknown> = {};
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(source, name)) {
      out[name] = source[name];
    }
  }
  return out;
}

/** Schema nodes for rendering the filters form. */
export function dashboardFilterSchemaNodes(schema: FormSchema | undefined): SchemaNode[] {
  if (!schema) return [];
  if (schema.schema?.length) return schema.schema;
  return schema.fields.map((field) => ({
    kind: 'field' as const,
    name: field.name,
    field,
  }));
}
