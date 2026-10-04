import assert from 'node:assert/strict';
import { describe, it, afterEach } from 'node:test';
import {
  DashboardPage,
  NavigationCardsWidget,
  Stat,
  StatsOverviewWidget,
  ChartWidget,
  ListWidget,
  html,
  isChartWidget,
  isDashboardPage,
  isNavigationCardsWidget,
  isStatsOverviewWidget,
  clampStatsOverviewColumns,
  resolveStatsOverviewColumns,
  statsOverviewGridStyle,
  autoStatsOverviewColumns,
  parsePollingIntervalMs,
  pickDashboardFilters,
  resolveDashboardFiltersForm,
  FormBuilder,
  Select,
} from '../src/index.js';

afterEach(() => {
  Stat.clearConfigureUsing();
  StatsOverviewWidget.clearConfigureUsing();
});

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
      .descriptionColor('info')
      .color('success')
      .icon('user-group')
      .url('/users')
      .openUrlInNewTab()
      .chart([1, 2, 3])
      .chartColor('warning')
      .placeholder('—')
      .extraAttributes({ class: 'cursor-pointer', 'data-x': '1' })
      .columnSpan(2);

    assert.deepEqual(stat.toJSON(), {
      label: 'Users',
      value: 10,
      description: 'Active',
      descriptionIcon: 'users',
      descriptionIconPosition: 'before',
      descriptionColor: 'info',
      color: 'success',
      icon: 'user-group',
      url: '/users',
      openUrlInNewTab: true,
      chart: [1, 2, 3],
      chartColor: 'warning',
      placeholder: '—',
      extraAttributes: { class: 'cursor-pointer', 'data-x': '1' },
      columnSpan: 2,
    });
  });

  it('Stat placeholder and HTML values', () => {
    assert.equal(Stat.make('Empty', null).placeholder('-').toJSON().value, '-');
    assert.equal(Stat.make('Zero', 0).placeholder('-').toJSON().value, 0);
    const rich = Stat.make(html('<b>L</b>'), html('<em>1</em>')).toJSON();
    assert.equal(rich.labelHtml, '<b>L</b>');
    assert.equal(rich.valueHtml, '<em>1</em>');
  });

  it('Stat.configureUsing applies defaults', () => {
    Stat.configureUsing((stat) => {
      stat.placeholder('n/a');
    });
    assert.equal(Stat.make('X', null).toJSON().value, 'n/a');
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

describe('StatsOverviewWidget.columns', () => {
  it('clamps, auto-resolves, and builds grid styles', () => {
    assert.equal(clampStatsOverviewColumns(0), 1);
    assert.equal(clampStatsOverviewColumns(99), 12);
    assert.equal(autoStatsOverviewColumns(2), 3);
    assert.equal(autoStatsOverviewColumns(4), 4);
    assert.equal(autoStatsOverviewColumns(3), 3);
    assert.deepEqual(resolveStatsOverviewColumns(4), { default: 1, sm: 4 });
    assert.deepEqual(resolveStatsOverviewColumns(null, 4), { default: 1, sm: 4 });
    assert.deepEqual(resolveStatsOverviewColumns({ sm: 2, lg: 4 }), {
      default: 1,
      sm: 2,
      lg: 4,
    });
    assert.equal(statsOverviewGridStyle(3), '--shamar-stats-cols: 1; --shamar-stats-cols-sm: 3');
    assert.match(statsOverviewGridStyle(null, 2), /--shamar-stats-cols-sm: 3/);
  });

  it('parses polling intervals', () => {
    assert.equal(parsePollingIntervalMs('5s'), 5000);
    assert.equal(parsePollingIntervalMs('500ms'), 500);
    assert.equal(parsePollingIntervalMs(null), null);
  });
});

describe('Dashboard filters', () => {
  class FilteredDashboard extends DashboardPage {
    static override filtersForm(form: FormBuilder) {
      return form.schema([
        Select.make('period').options([
          { label: 'Today', value: 'today' },
          { label: 'MTD', value: 'mtd' },
        ]),
      ]);
    }
  }

  it('resolves filters form and picks query values', () => {
    const schema = resolveDashboardFiltersForm(FilteredDashboard);
    assert.ok(schema);
    assert.equal(schema!.fields[0]!.name, 'period');
    assert.deepEqual(pickDashboardFilters({ period: 'mtd', noise: 1 }, schema), {
      period: 'mtd',
    });
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
