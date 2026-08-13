import { Widget, type WidgetRequestContext } from '../widget.js';
import type { WidgetClass } from '../widget.js';

export type ChartType = 'line' | 'bar' | 'area' | 'donut' | 'pie';
export type ChartLibrary = 'apex' | 'chartjs';

export interface ChartDataset {
  label: string;
  data: number[];
  color?: string;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

/**
 * Chart card — ApexCharts by default; Chart.js optional.
 */
export abstract class ChartWidget extends Widget {
  static type(): ChartType {
    return 'line';
  }

  static library(): ChartLibrary {
    return 'apex';
  }

  static data(_ctx: WidgetRequestContext): ChartData | Promise<ChartData> {
    return { labels: [], datasets: [] };
  }
}

export function isChartWidget(value: WidgetClass): value is typeof ChartWidget {
  let current: unknown = value;
  while (typeof current === 'function') {
    if (current === ChartWidget) return true;
    current = Object.getPrototypeOf(current);
  }
  return false;
}
