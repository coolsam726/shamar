import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DashboardPage,
  NavigationCardsWidget,
  Stat,
  StatsOverviewWidget,
  ChartWidget,
} from '@shamar/core';
import { resolveDashboardWidgets, htmlAttrs } from '../src/shamar/dashboard-widgets.js';

class DemoStats extends StatsOverviewWidget {
  static override heading = 'KPIs';
  static override description = 'Overview';
  static override isLazy = false;
  static override pollingInterval: string | null = null;

  static override stats() {
    return [Stat.make('Total', 3)];
  }
}

class DemoChart extends ChartWidget {
  static override heading = 'Trend';
  static override isLazy = false;

  static override data() {
    return {
      labels: ['A', 'B'],
      datasets: [{ label: 'Count', data: [1, 2] }],
    };
  }
}

class DemoDashboard extends DashboardPage {
  static override widgets() {
    return [DemoStats, DemoChart];
  }
}

describe('resolveDashboardWidgets', () => {
  it('resolves stats and chart widgets with metadata', async () => {
    const result = await resolveDashboardWidgets(DemoDashboard, { user: null, basePath: '/demo' }, {
      refreshUrlBase: '/demo',
    });

    assert.equal(result.columns, 3);
    assert.equal(result.widgets.length, 2);

    const stats = result.widgets[0]!;
    assert.equal(stats.kind, 'statsOverview');
    assert.equal(stats.heading, 'KPIs');
    assert.equal(stats.description, 'Overview');
    assert.equal(stats.isLazy, false);
    assert.equal(stats.pollingIntervalMs, null);
    assert.equal(stats.refreshUrl, '/demo/widgets/DemoStats');
    assert.equal(stats.payload.stats[0]!.label, 'Total');
    assert.equal(stats.payload.stats[0]!.value, 3);
    assert.ok(stats.payload.gridStyle.includes('--shamar-stats-cols'));

    const chart = result.widgets[1]!;
    assert.equal(chart.kind, 'chart');
    assert.equal(chart.payload.chartType, 'line');
    assert.equal(chart.payload.library, 'apex');
  });

  it('defers lazy stats until hydrate', async () => {
    class LazyStats extends StatsOverviewWidget {
      static override isLazy = true;
      static override pollingInterval: string | null = '5s';
      static override stats() {
        return [Stat.make('X', 1)];
      }
    }
    class LazyDash extends DashboardPage {
      static override widgets() {
        return [LazyStats];
      }
    }

    const deferred = await resolveDashboardWidgets(LazyDash, { user: null }, {
      refreshUrlBase: '/admin',
    });
    assert.equal(deferred.widgets[0]!.payload.deferred, true);
    assert.equal(deferred.widgets[0]!.payload.stats.length, 0);
    assert.equal(deferred.widgets[0]!.pollingIntervalMs, 5000);

    const hydrated = await resolveDashboardWidgets(LazyDash, { user: null }, {
      hydrate: true,
      widgetId: 'LazyStats',
      refreshUrlBase: '/admin',
    });
    assert.equal(hydrated.widgets.length, 1);
    assert.equal(hydrated.widgets[0]!.payload.deferred, undefined);
    assert.equal(hydrated.widgets[0]!.payload.stats[0]!.value, 1);
  });

  it('injects navigation cards from shell menu roots', async () => {
    const result = await resolveDashboardWidgets(DashboardPage, { user: null }, {
      navigationCards: [
        { label: 'Catalog', href: '/demo/products', icon: 'squares-2x2', rootIndex: 1, active: false },
      ],
    });

    assert.equal(result.widgets.length, 1);
    assert.equal(result.widgets[0]?.kind, 'navigationCards');
    assert.deepEqual(result.widgets[0]?.payload, {
      cards: [{ label: 'Catalog', href: '/demo/products', icon: 'squares-2x2' }],
      emptyMessage: 'No resources registered yet.',
    });
  });

  it('passes StatsOverviewWidget.columns into the payload grid style', async () => {
    class FourColStats extends StatsOverviewWidget {
      static override columns = 4;
      static override isLazy = false;
      static override pollingInterval: string | null = null;

      static override stats() {
        return [Stat.make('A', 1), Stat.make('B', 2), Stat.make('C', 3), Stat.make('D', 4)];
      }
    }

    class FourColDashboard extends DashboardPage {
      static override widgets() {
        return [FourColStats];
      }
    }

    const result = await resolveDashboardWidgets(FourColDashboard, { user: null });
    const stats = result.widgets[0]!;
    assert.equal(stats.kind, 'statsOverview');
    assert.deepEqual(stats.payload.columns, { default: 1, sm: 4 });
    assert.equal(stats.payload.gridStyle, '--shamar-stats-cols: 1; --shamar-stats-cols-sm: 4');
  });

  it('skips widgets when canView returns false', async () => {
    class HiddenStats extends StatsOverviewWidget {
      static override canView() {
        return false;
      }

      static override stats() {
        return [Stat.make('Hidden', 0)];
      }
    }

    class HiddenDashboard extends DashboardPage {
      static override widgets() {
        return [HiddenStats];
      }
    }

    const result = await resolveDashboardWidgets(HiddenDashboard, { user: null });
    assert.equal(result.widgets.length, 0);
  });

  it('htmlAttrs escapes values', () => {
    assert.equal(htmlAttrs({ class: 'a"b', 'data-x': '1' }), 'class="a&quot;b" data-x="1"');
  });
});
