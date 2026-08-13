import { Page } from './page.js';
import { NavigationCardsWidget } from './widgets/navigation-cards-widget.js';
import type { WidgetClass } from './widget.js';

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
