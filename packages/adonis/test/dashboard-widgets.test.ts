import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DashboardPage,
  NavigationCardsWidget,
  Stat,
  StatsOverviewWidget,
  ChartWidget,
} from '@shamar/core';
import { resolveDashboardWidgets } from '../src/shamar/dashboard-widgets.js';

class DemoStats extends StatsOverviewWidget {
  static override heading = 'KPIs';

  static override stats() {
    return [Stat.make('Total', 3)];
  }
}

class DemoChart extends ChartWidget {
  static override heading = 'Trend';

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
    const result = await resolveDashboardWidgets(DemoDashboard, { user: null, basePath: '/demo' });

    assert.equal(result.columns, 3);
    assert.equal(result.widgets.length, 2);

    const stats = result.widgets[0]!;
    assert.equal(stats.kind, 'statsOverview');
    assert.equal(stats.heading, 'KPIs');
    assert.deepEqual(stats.payload, { stats: [{ label: 'Total', value: 3 }] });

    const chart = result.widgets[1]!;
    assert.equal(chart.kind, 'chart');
    assert.equal(chart.payload.chartType, 'line');
    assert.equal(chart.payload.library, 'apex');
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
});
