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
  columnSpan: number | 'full';
  sort: number;
  view?: string;
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
}

export interface CardPayload {
  content: CardWidgetContent;
}

export interface ListPayload {
  columns: ListWidgetColumn[];
  records: ListWidgetRecord[];
  limit: number;
}

export interface ChartPayload {
  chartType: ChartType;
  library: ChartLibrary;
  data: ChartData;
}

export interface NavigationCardsPayload {
  cards: NavigationCardItem[];
  emptyMessage?: string;
}
