import {
  DashboardPage,
  DASHBOARD_PAGE_SLUG,
  Stat,
  isCardWidget,
  isChartWidget,
  isListWidget,
  isNavigationCardsWidget,
  isStatsOverviewWidget,
  parsePollingIntervalMs,
  resolveStatsOverviewColumns,
  statsOverviewGridStyle,
  type DashboardPageClass,
  type ResolvedDashboardWidget,
  type WidgetClass,
  type WidgetRequestContext,
} from '@shamar/core';
import type { MenuRoot } from './menu.js';

export type ResolveDashboardWidgetsOptions = {
  navigationCards?: MenuRoot[];
  /** When true, resolve lazy widgets fully (used by the refresh endpoint). */
  hydrate?: boolean;
  /** Only resolve a single widget id (refresh endpoint). */
  widgetId?: string;
  /** Absolute or panel-relative base for refresh URLs. */
  refreshUrlBase?: string;
};

function widgetId(WidgetClass: WidgetClass): string {
  return WidgetClass.id?.trim() || WidgetClass.name || 'widget';
}

function serializeStats(raw: Stat[] | ReturnType<Stat['toJSON']>[]): ReturnType<Stat['toJSON']>[] {
  return raw.map((item) => {
    const data = item instanceof Stat ? item.toJSON() : { ...item };
    if (data.extraAttributes) {
      data.extraAttributesHtml = htmlAttrs(data.extraAttributes);
    }
    return data;
  });
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

function widgetMeta(
  WidgetClass: WidgetClass,
  id: string,
  refreshUrlBase?: string,
): Pick<
  ResolvedDashboardWidget,
  | 'id'
  | 'heading'
  | 'description'
  | 'columnSpan'
  | 'sort'
  | 'view'
  | 'pollingIntervalMs'
  | 'isLazy'
  | 'refreshUrl'
> {
  // Root-mounted panels use '' as prefix — still emit `/widgets/:id`.
  const basePath = (refreshUrlBase ?? '').replace(/\/+$/, '');
  return {
    id,
    heading: WidgetClass.heading,
    description: WidgetClass.description,
    columnSpan: WidgetClass.columnSpan ?? 1,
    sort: WidgetClass.sort ?? 0,
    view: WidgetClass.view,
    pollingIntervalMs: parsePollingIntervalMs(WidgetClass.pollingInterval),
    isLazy: WidgetClass.isLazy !== false,
    refreshUrl: `${basePath}/widgets/${encodeURIComponent(id)}`,
  };
}

export async function resolveDashboardWidgets(
  DashboardClass: DashboardPageClass,
  ctx: WidgetRequestContext,
  options: ResolveDashboardWidgetsOptions = {},
): Promise<{ columns: number; widgets: ResolvedDashboardWidget[] }> {
  const widgetClasses = DashboardClass.widgets()
    .slice()
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

  const widgets: ResolvedDashboardWidget[] = [];
  const hydrate = options.hydrate === true;
  const onlyId = options.widgetId;

  for (const WidgetClass of widgetClasses) {
    if (!WidgetClass.canView(ctx.user)) continue;
    const id = widgetId(WidgetClass);
    if (onlyId && id !== onlyId) continue;

    const base = widgetMeta(WidgetClass, id, options.refreshUrlBase);
    const defer = base.isLazy && !hydrate;

    if (isStatsOverviewWidget(WidgetClass)) {
      WidgetClass.applyConfigurators(WidgetClass);
      if (defer) {
        const columns = resolveStatsOverviewColumns(WidgetClass.columns, 0);
        widgets.push({
          ...base,
          kind: 'statsOverview',
          payload: {
            stats: [],
            columns,
            gridStyle: statsOverviewGridStyle(WidgetClass.columns, 0),
            deferred: true,
          },
        });
        continue;
      }

      const raw = await WidgetClass.stats(ctx);
      const stats = serializeStats(raw);
      widgets.push({
        ...base,
        kind: 'statsOverview',
        payload: {
          stats,
          columns: resolveStatsOverviewColumns(WidgetClass.columns, stats.length),
          gridStyle: statsOverviewGridStyle(WidgetClass.columns, stats.length),
        },
      });
      continue;
    }

    if (isCardWidget(WidgetClass)) {
      if (defer) {
        widgets.push({
          ...base,
          kind: 'card',
          payload: { content: { html: '' }, deferred: true },
        });
        continue;
      }
      const content = await WidgetClass.content(ctx);
      widgets.push({
        ...base,
        kind: 'card',
        payload: { content },
      });
      continue;
    }

    if (isListWidget(WidgetClass)) {
      if (defer) {
        widgets.push({
          ...base,
          kind: 'list',
          payload: { columns: WidgetClass.columns(), records: [], limit: WidgetClass.limit ?? 5, deferred: true },
        });
        continue;
      }
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
      if (defer) {
        widgets.push({
          ...base,
          kind: 'chart',
          payload: {
            chartType: WidgetClass.type(),
            library: WidgetClass.library(),
            data: { labels: [], datasets: [] },
            deferred: true,
          },
        });
        continue;
      }
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
      // Navigation cards are shell-derived — always hydrate (not expensive).
      const cards = (options.navigationCards ?? []).map((root) => ({
        label: root.label,
        href: root.href,
        icon: root.icon,
      }));
      widgets.push({
        ...base,
        isLazy: false,
        pollingIntervalMs: null,
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

/** Escape and join HTML attributes for Edge `{{{ htmlAttrs(attrs) }}}`. */
export function htmlAttrs(attrs: Record<string, string> | null | undefined): string {
  if (!attrs) return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    const safeKey = escapeAttr(key);
    if (value == null || value === '') {
      parts.push(safeKey);
    } else {
      parts.push(`${safeKey}="${escapeAttr(value)}"`);
    }
  }
  return parts.join(' ');
}

function escapeAttr(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
