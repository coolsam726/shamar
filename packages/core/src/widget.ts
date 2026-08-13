import type { ShamarUser } from './types.js';

/** Context passed into dashboard widget data hooks. */
export interface WidgetRequestContext {
  user?: ShamarUser | null;
  panelId?: string;
  /** Panel base path for building widget links. */
  basePath?: string;
}

export type WidgetColumnSpan = number | 'full';

/**
 * Filament-style dashboard widget base class.
 * Subclass and register on a {@link DashboardPage} via {@link DashboardPage.widgets}.
 */
export abstract class Widget {
  /** Stable id for DOM / chart mounting. Defaults to the class name at resolve time. */
  static id?: string;
  static sort = 0;
  static columnSpan: WidgetColumnSpan = 1;
  static heading?: string;
  /** Optional Edge view override (`shamar::widgets/...` or app view path). */
  static view?: string;

  static canView(_user: ShamarUser | null | undefined): boolean {
    return true;
  }
}

export type WidgetClass = typeof Widget;

/** True when `value` extends {@link Widget}. */
export function isWidgetClass(value: unknown): value is WidgetClass {
  if (typeof value !== 'function') return false;
  let current: unknown = value;
  while (typeof current === 'function') {
    if (current === Widget) return true;
    current = Object.getPrototypeOf(current);
  }
  return false;
}
