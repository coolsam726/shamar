import type { ShamarUser } from './types.js';

/** Context passed into dashboard widget data hooks. */
export interface WidgetRequestContext {
  user?: ShamarUser | null;
  panelId?: string;
  /** Panel base path for building widget links. */
  basePath?: string;
  /**
   * Dashboard page filters (Filament `$pageFilters` / `InteractsWithPageFilters`).
   * Populated from the dashboard filters form query string.
   */
  filters?: Record<string, unknown>;
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
  /** Optional subtitle under the heading (Filament `$description`). */
  static description?: string;
  /** Optional Edge view override (`shamar::widgets/...` or app view path). */
  static view?: string;
  /**
   * Poll interval (Filament `$pollingInterval`), e.g. `'5s'`, `'500ms'`.
   * `null` disables polling.
   */
  static pollingInterval: string | null = null;
  /**
   * When true, defer data until the widget is visible (Filament `$isLazy`).
   * Base default is `false` (SSR-friendly); {@link StatsOverviewWidget} defaults to `true`.
   */
  static isLazy = false;

  static canView(_user: ShamarUser | null | undefined): boolean {
    return true;
  }
}

export type WidgetClass = typeof Widget;

/** Parse Filament-style `'5s'` / `'500ms'` into milliseconds. */
export function parsePollingIntervalMs(value: string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const match = /^(\d+(?:\.\d+)?)\s*(ms|s)?$/i.exec(value.trim());
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount < 0) return null;
  const unit = (match[2] ?? 's').toLowerCase();
  return unit === 'ms' ? Math.round(amount) : Math.round(amount * 1000);
}

/**
 * Filament `InteractsWithPageFilters` — read dashboard filter values from context.
 */
export function pageFilters(ctx: WidgetRequestContext): Record<string, unknown> {
  return ctx.filters ?? {};
}

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
