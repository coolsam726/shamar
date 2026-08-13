import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DashboardPage,
  NavigationCardsWidget,
  Stat,
  StatsOverviewWidget,
  ChartWidget,
  ListWidget,
  isChartWidget,
  isDashboardPage,
  isNavigationCardsWidget,
  isStatsOverviewWidget,
} from '../src/index.js';

class DemoStats extends StatsOverviewWidget {
  static override stats() {
    return [
      Stat.make('Orders', 42).description('Today').color('success').chart([1, 4, 2, 8]),
      Stat.make('Revenue', '$1.2k'),
    ];
  }
}

class DemoChart extends ChartWidget {
  static override type() {
    return 'line' as const;
  }

  static override library() {
    return 'chartjs' as const;
  }

  static override data() {
    return {
      labels: ['Mon', 'Tue'],
      datasets: [{ label: 'Visits', data: [3, 7] }],
    };
  }
}

class DemoDashboard extends DashboardPage {
  static override widgets() {
    return [DemoStats, DemoChart, ...super.widgets()];
  }
}

describe('Dashboard widgets', () => {
  it('Stat serializes fluent options', () => {
    const stat = Stat.make('Users', 10)
      .description('Active')
      .descriptionIcon('users', 'before')
      .color('info')
      .url('/users')
      .chart([1, 2, 3]);

    assert.deepEqual(stat.toJSON(), {
      label: 'Users',
      value: 10,
      description: 'Active',
      descriptionIcon: 'users',
      descriptionIconPosition: 'before',
      color: 'info',
      url: '/users',
      chart: [1, 2, 3],
    });
  });

  it('DashboardPage defaults to navigation cards widget', () => {
    assert.equal(isDashboardPage(DashboardPage), true);
    assert.equal(isDashboardPage(DemoDashboard), true);
    assert.equal(DashboardPage.slug, '__dashboard__');
    assert.equal(DashboardPage.navigationHidden, true);
    assert.deepEqual(
      DashboardPage.widgets().map((Widget) => Widget.name),
      [NavigationCardsWidget.name],
    );
  });

  it('widget kind guards recognize subclasses', () => {
    assert.equal(isStatsOverviewWidget(DemoStats), true);
    assert.equal(isChartWidget(DemoChart), true);
    assert.equal(isNavigationCardsWidget(NavigationCardsWidget), true);
    assert.equal(isStatsOverviewWidget(ListWidget as never), false);
  });

  it('custom dashboard can extend default widgets', () => {
    const widgets = DemoDashboard.widgets();
    assert.equal(widgets.length, 3);
    assert.equal(widgets[0], DemoStats);
    assert.equal(widgets[2], NavigationCardsWidget);
  });
});

describe('ListWidget', () => {
  class RecentItems extends ListWidget {
    static override columns() {
      return [{ label: 'Name', attribute: 'name' }];
    }

    static override records() {
      return [{ name: 'Alpha', url: '/items/1' }];
    }
  }

  it('exposes columns and records hooks', async () => {
    assert.deepEqual(RecentItems.columns(), [{ label: 'Name', attribute: 'name' }]);
    assert.deepEqual(await RecentItems.records({}), [{ name: 'Alpha', url: '/items/1' }]);
    assert.equal(RecentItems.limit, 5);
  });
});
