import { Widget, type WidgetClass, type WidgetRequestContext } from '../widget.js';
import { Stat, type StatData } from './stat.js';

/**
 * Grid of KPI stat cards (Filament StatsOverviewWidget).
 */
export abstract class StatsOverviewWidget extends Widget {
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
