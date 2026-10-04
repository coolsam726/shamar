import { Widget, type WidgetClass, type WidgetRequestContext } from '../widget.js';
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

export function clampStatsOverviewColumns(value: number): number {
  if (!Number.isFinite(value)) return COL_MIN;
  return Math.min(COL_MAX, Math.max(COL_MIN, Math.floor(value)));
}

/** Normalize widget `columns` into a breakpoint map, or `null` for the legacy default grid. */
export function resolveStatsOverviewColumns(
  columns: StatsOverviewColumns | null | undefined,
): Partial<Record<StatsOverviewBreakpoint, number>> | null {
  if (columns == null) return null;

  if (typeof columns === 'number') {
    const n = clampStatsOverviewColumns(columns);
    return { default: 1, sm: n };
  }

  const out: Partial<Record<StatsOverviewBreakpoint, number>> = {};
  for (const bp of BREAKPOINTS) {
    const raw = columns[bp];
    if (raw != null) out[bp] = clampStatsOverviewColumns(raw);
  }
  if (!Object.keys(out).length) return null;
  if (out.default == null) out.default = 1;
  return out;
}

/** Inline CSS custom properties consumed by `.shamar-stats-overview__grid`. */
export function statsOverviewGridStyle(
  columns: StatsOverviewColumns | null | undefined,
): string | null {
  const resolved = resolveStatsOverviewColumns(columns);
  if (!resolved) return null;

  const parts: string[] = [];
  for (const bp of BREAKPOINTS) {
    const n = resolved[bp];
    if (n != null) parts.push(`${CSS_VARS[bp]}: ${n}`);
  }
  return parts.length ? parts.join('; ') : null;
}

/**
 * Grid of KPI stat cards (Filament StatsOverviewWidget).
 */
export abstract class StatsOverviewWidget extends Widget {
  /**
   * Cards per row inside this widget (Filament `getColumns()`).
   * Leave `null` for the legacy responsive default (`sm:2` / `lg:3` / `xl:5`).
   */
  static columns: StatsOverviewColumns | null = null;

  static stats(
    _ctx: WidgetRequestContext,
  ): Stat[] | StatData[] | Promise<Stat[] | StatData[]> {
    return [];
  }
}

export function isStatsOverviewWidget(value: WidgetClass): value is typeof StatsOverviewWidget {
  let current: unknown = value;
  while (typeof current === 'function') {
    if (current === StatsOverviewWidget) return true;
    current = Object.getPrototypeOf(current);
  }
  return false;
}
