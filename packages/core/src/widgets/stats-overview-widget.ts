import {
  Widget,
  parsePollingIntervalMs,
  type WidgetClass,
  type WidgetRequestContext,
} from '../widget.js';
import { Stat, type StatData } from './stat.js';

export type StatsOverviewBreakpoint = 'default' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Cards-per-row for {@link StatsOverviewWidget} (Filament `getColumns()`).
 * - `number` — that many columns from the `sm` breakpoint up (1 column on the smallest screens)
 * - object — responsive map, e.g. `{ sm: 2, lg: 4 }`
 */
export type StatsOverviewColumns = number | Partial<Record<StatsOverviewBreakpoint, number>>;

const COL_MIN = 1;
const COL_MAX = 12;
const BREAKPOINTS: StatsOverviewBreakpoint[] = ['default', 'sm', 'md', 'lg', 'xl', '2xl'];

const CSS_VARS: Record<StatsOverviewBreakpoint, string> = {
  default: '--shamar-stats-cols',
  sm: '--shamar-stats-cols-sm',
  md: '--shamar-stats-cols-md',
  lg: '--shamar-stats-cols-lg',
  xl: '--shamar-stats-cols-xl',
  '2xl': '--shamar-stats-cols-2xl',
};

export type StatsOverviewConfigurator = (widget: typeof StatsOverviewWidget) => void;

const widgetConfigurators: StatsOverviewConfigurator[] = [];

export function clampStatsOverviewColumns(value: number): number {
  if (!Number.isFinite(value)) return COL_MIN;
  return Math.min(COL_MAX, Math.max(COL_MIN, Math.floor(value)));
}

/** Filament auto `getColumns()` heuristic from stat count. */
export function autoStatsOverviewColumns(statsCount: number): number {
  const count = Math.max(0, Math.floor(statsCount));
  if (count < 3) return 3;
  if (count % 3 !== 1) return 3;
  return 4;
}

/**
 * Normalize widget `columns` into a breakpoint map.
 * When `columns` is null/undefined, uses Filament’s count-based default.
 */
export function resolveStatsOverviewColumns(
  columns: StatsOverviewColumns | null | undefined,
  statsCount = 0,
): Partial<Record<StatsOverviewBreakpoint, number>> {
  if (columns == null) {
    const n = autoStatsOverviewColumns(statsCount);
    return { default: 1, sm: n };
  }

  if (typeof columns === 'number') {
    const n = clampStatsOverviewColumns(columns);
    return { default: 1, sm: n };
  }

  const out: Partial<Record<StatsOverviewBreakpoint, number>> = {};
  for (const bp of BREAKPOINTS) {
    const raw = columns[bp];
    if (raw != null) out[bp] = clampStatsOverviewColumns(raw);
  }
  if (!Object.keys(out).length) {
    const n = autoStatsOverviewColumns(statsCount);
    return { default: 1, sm: n };
  }
  if (out.default == null) out.default = 1;
  return out;
}

/** Inline CSS custom properties consumed by `.shamar-stats-overview__grid`. */
export function statsOverviewGridStyle(
  columns: StatsOverviewColumns | null | undefined,
  statsCount = 0,
): string {
  const resolved = resolveStatsOverviewColumns(columns, statsCount);
  const parts: string[] = [];
  for (const bp of BREAKPOINTS) {
    const n = resolved[bp];
    if (n != null) parts.push(`${CSS_VARS[bp]}: ${n}`);
  }
  return parts.join('; ');
}

/**
 * Grid of KPI stat cards (Filament StatsOverviewWidget).
 */
export abstract class StatsOverviewWidget extends Widget {
  /**
   * Cards per row inside this widget (Filament `getColumns()`).
   * Leave `null` for Filament’s count-based auto layout (3 or 4).
   */
  static columns: StatsOverviewColumns | null = null;

  /** Filament default: refresh every 5 seconds. Set `null` to disable. */
  static override pollingInterval: string | null = '5s';

  /** Filament default: lazy-load when visible. */
  static override isLazy = true;

  static stats(
    _ctx: WidgetRequestContext,
  ): Stat[] | StatData[] | Promise<Stat[] | StatData[]> {
    return [];
  }

  /** Filament-style global defaults for every stats overview widget class. */
  static configureUsing(callback: StatsOverviewConfigurator): void {
    widgetConfigurators.push(callback);
  }

  /** Test helper. */
  static clearConfigureUsing(): void {
    widgetConfigurators.length = 0;
    configuredWidgets = new WeakSet();
  }

  /** Apply {@link configureUsing} callbacks onto a concrete widget class (once). */
  static applyConfigurators(WidgetClass: typeof StatsOverviewWidget): void {
    if (configuredWidgets.has(WidgetClass)) return;
    for (const configure of widgetConfigurators) configure(WidgetClass);
    configuredWidgets.add(WidgetClass);
  }
}

let configuredWidgets = new WeakSet<typeof StatsOverviewWidget>();

export function isStatsOverviewWidget(value: WidgetClass): value is typeof StatsOverviewWidget {
  let current: unknown = value;
  while (typeof current === 'function') {
    if (current === StatsOverviewWidget) return true;
    current = Object.getPrototypeOf(current);
  }
  return false;
}

export { parsePollingIntervalMs };
