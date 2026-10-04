import type { StatData } from './widgets/stat.js';
import type { CardWidgetContent } from './widgets/card-widget.js';
import type { ListWidgetColumn, ListWidgetRecord } from './widgets/list-widget.js';
import type { ChartData, ChartLibrary, ChartType } from './widgets/chart-widget.js';

export type DashboardWidgetKind =
  | 'statsOverview'
  | 'card'
  | 'list'
  | 'chart'
  | 'navigationCards';

export interface NavigationCardItem {
  label: string;
  href: string;
  icon?: string;
}

export interface ResolvedDashboardWidget {
  id: string;
  kind: DashboardWidgetKind;
  heading?: string;
  description?: string;
  columnSpan: number | 'full';
  sort: number;
  view?: string;
  /** Parsed polling interval in ms; `null` disables. */
  pollingIntervalMs: number | null;
  /** When true, payload may be deferred until the client loads the widget. */
  isLazy: boolean;
  /** Panel-relative URL to re-fetch this widget’s HTML fragment. */
  refreshUrl?: string;
  payload: DashboardWidgetPayload;
}

export type DashboardWidgetPayload =
  | StatsOverviewPayload
  | CardPayload
  | ListPayload
  | ChartPayload
  | NavigationCardsPayload;

export interface StatsOverviewPayload {
  stats: StatData[];
  /** Resolved cards-per-row config. */
  columns: Partial<Record<string, number>>;
  /** Inline CSS vars for `.shamar-stats-overview__grid`. */
  gridStyle: string;
  /** True when stats were not resolved yet (lazy placeholder). */
  deferred?: boolean;
}

export interface CardPayload {
  content: CardWidgetContent;
}

export interface ListPayload {
  columns: ListWidgetColumn[];
  records: ListWidgetRecord[];
  limit: number;
  deferred?: boolean;
}

export interface ChartPayload {
  chartType: ChartType;
  library: ChartLibrary;
  data: ChartData;
  deferred?: boolean;
}

export interface NavigationCardsPayload {
  cards: NavigationCardItem[];
  emptyMessage?: string;
  deferred?: boolean;
}
