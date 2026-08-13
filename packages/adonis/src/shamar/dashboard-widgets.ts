import {
  DashboardPage,
  DASHBOARD_PAGE_SLUG,
  Stat,
  isCardWidget,
  isChartWidget,
  isListWidget,
  isNavigationCardsWidget,
  isStatsOverviewWidget,
  type DashboardPageClass,
  type ResolvedDashboardWidget,
  type WidgetClass,
  type WidgetRequestContext,
} from '@shamar/core';
import type { MenuRoot } from './menu.js';

function widgetId(WidgetClass: WidgetClass): string {
  return WidgetClass.id?.trim() || WidgetClass.name || 'widget';
}

function serializeStats(raw: Stat[] | ReturnType<Stat['toJSON']>[]): ReturnType<Stat['toJSON']>[] {
  return raw.map((item) => (item instanceof Stat ? item.toJSON() : item));
}

function getAtPath(record: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = record;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function formatCell(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export async function resolveDashboardWidgets(
  DashboardClass: DashboardPageClass,
  ctx: WidgetRequestContext,
  options: { navigationCards?: MenuRoot[] } = {},
): Promise<{ columns: number; widgets: ResolvedDashboardWidget[] }> {
  const widgetClasses = DashboardClass.widgets()
    .slice()
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

  const widgets: ResolvedDashboardWidget[] = [];

  for (const WidgetClass of widgetClasses) {
    if (!WidgetClass.canView(ctx.user)) continue;

    const base = {
      id: widgetId(WidgetClass),
      heading: WidgetClass.heading,
      columnSpan: WidgetClass.columnSpan ?? 1,
      sort: WidgetClass.sort ?? 0,
      view: WidgetClass.view,
    };

    if (isStatsOverviewWidget(WidgetClass)) {
      const raw = await WidgetClass.stats(ctx);
      widgets.push({
        ...base,
        kind: 'statsOverview',
        payload: { stats: serializeStats(raw) },
      });
      continue;
    }

    if (isCardWidget(WidgetClass)) {
      const content = await WidgetClass.content(ctx);
      widgets.push({
        ...base,
        kind: 'card',
        payload: { content },
      });
      continue;
    }

    if (isListWidget(WidgetClass)) {
      const records = await WidgetClass.records(ctx);
      const limit = WidgetClass.limit ?? 5;
      widgets.push({
        ...base,
        kind: 'list',
        payload: {
          columns: WidgetClass.columns(),
          records: records.slice(0, limit).map((record) => {
            const cells: Record<string, string> = {};
            for (const column of WidgetClass.columns()) {
              cells[column.attribute] = formatCell(getAtPath(record, column.attribute));
            }
            return {
              ...record,
              _cells: cells,
            };
          }),
          limit,
        },
      });
      continue;
    }

    if (isChartWidget(WidgetClass)) {
      const data = await WidgetClass.data(ctx);
      widgets.push({
        ...base,
        kind: 'chart',
        payload: {
          chartType: WidgetClass.type(),
          library: WidgetClass.library(),
          data,
        },
      });
      continue;
    }

    if (isNavigationCardsWidget(WidgetClass)) {
      const cards = (options.navigationCards ?? []).map((root) => ({
        label: root.label,
        href: root.href,
        icon: root.icon,
      }));
      widgets.push({
        ...base,
        kind: 'navigationCards',
        payload: {
          cards,
          emptyMessage: 'No resources registered yet.',
        },
      });
    }
  }

  const columns = Math.min(4, Math.max(1, DashboardClass.columns ?? 3));

  return { columns, widgets };
}

export function resolveDashboardPageClass(
  configured?: DashboardPageClass,
): DashboardPageClass {
  return configured ?? DashboardPage;
}

export function filterDashboardFromPages<T extends { slug: string }>(pages: T[]): T[] {
  return pages.filter((page) => page.slug !== DASHBOARD_PAGE_SLUG);
}
