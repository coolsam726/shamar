import { Widget, type WidgetRequestContext } from '../widget.js';
import type { WidgetClass } from '../widget.js';

export type ChartType = 'line' | 'bar' | 'area' | 'donut' | 'pie';
export type ChartLibrary = 'apex' | 'chartjs';

export interface ChartDataset {
  label: string;
  data: number[];
  /**
   * Series color for line/bar/area.
   * For pie/donut: a single-slice color, or a `string[]` of per-slice colors
   * (same length as `data` / `labels`). Prefer top-level {@link ChartData.colors}.
   */
  color?: string | string[];
  /** Per-slice colors for pie/donut (alias of `color: string[]`). */
  colors?: string[];
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
  /**
   * Per-slice colors for pie/donut (aligned with `labels` / slice order).
   * Preferred when coloring individual slices.
   */
  colors?: string[];
}

export type ResolveChartSeriesColorsInput = {
  labels?: string[];
  datasets?: Array<{
    color?: string | string[];
    colors?: string[];
    data?: number[];
  }>;
  colors?: string[];
  /** True for pie / donut / doughnut. */
  radial: boolean;
  /** Fallback palette (cycled when shorter than the series count). */
  palette: string[];
};

function asColorList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && Boolean(entry.trim()));
}

function firstColor(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const first = value.find((entry): entry is string => typeof entry === 'string' && Boolean(entry.trim()));
    return first?.trim() ?? null;
  }
  return null;
}

/**
 * Resolve Apex / Chart.js series colors.
 *
 * Pie/donut priority: top-level `colors` → `datasets[0].colors` →
 * `datasets[0].color` as `string[]` → per-dataset `color` string → brand palette.
 * Line/bar/area: each `datasets[i].color` (string), then top-level `colors[i]`, then palette.
 *
 * Keep browser `resolveChartColors` in `@shamar/adonis` assets/shamar-ui.js in sync.
 */
export function resolveChartSeriesColors(input: ResolveChartSeriesColorsInput): string[] {
  const labels = Array.isArray(input.labels) ? input.labels : [];
  const datasets = Array.isArray(input.datasets) ? input.datasets : [];
  const palette = input.palette.length > 0 ? input.palette : ['#f1511b'];
  const topColors = asColorList(input.colors);

  const pick = (index: number, preferred?: string | null): string => {
    if (preferred && preferred.trim()) return preferred.trim();
    return palette[index % palette.length]!;
  };

  if (!input.radial) {
    const count = Math.max(datasets.length, 1);
    return Array.from({ length: count }, (_, index) =>
      pick(index, firstColor(datasets[index]?.color) ?? topColors[index] ?? null),
    );
  }

  const sliceCount = Math.max(labels.length, datasets[0]?.data?.length ?? 0, 1);

  if (topColors.length > 0) {
    return Array.from({ length: sliceCount }, (_, index) => pick(index, topColors[index] ?? null));
  }

  const fromColorsProp = asColorList(datasets[0]?.colors);
  const fromColorArray = asColorList(datasets[0]?.color);
  const datasetSliceColors = fromColorsProp.length > 0 ? fromColorsProp : fromColorArray;
  if (datasetSliceColors.length > 0) {
    return Array.from({ length: sliceCount }, (_, index) =>
      pick(index, datasetSliceColors[index] ?? null),
    );
  }

  if (datasets.length > 1) {
    return Array.from({ length: sliceCount }, (_, index) =>
      pick(index, firstColor(datasets[index]?.color)),
    );
  }

  if (datasets.length === 1 && sliceCount === 1) {
    const only = firstColor(datasets[0]?.color);
    if (only) return [pick(0, only)];
  }

  return Array.from({ length: sliceCount }, (_, index) => pick(index));
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
