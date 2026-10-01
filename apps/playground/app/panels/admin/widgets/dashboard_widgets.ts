import {
  StatsOverviewWidget,
  ListWidget,
  ChartWidget,
  NavigationCardsWidget,
  Stat,
  formatCompactNumber,
  type WidgetRequestContext,
} from '@shamar/core'
import Product from '#models/product'
import DailyMetric from '#models/daily_metric'
import TrafficSource from '#models/traffic_source'

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

async function loadDailyMetrics(days = 30) {
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - (days - 1))

  return DailyMetric.find({ date: { $gte: start } })
    .sort({ date: 1 })
    .lean()
}

export class ProductStatsWidget extends StatsOverviewWidget {
  static override sort = 10
  static override columnSpan = 'full' as const

  static override async stats(ctx: WidgetRequestContext) {
    const [total, lowStock, featured, metrics] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ stock: { $lte: 5 } }),
      Product.countDocuments({ featured: true }),
      loadDailyMetrics(30),
    ])

    const visits30d = metrics.reduce((sum, row) => sum + Number(row.visits ?? 0), 0)
    const revenue30d = metrics.reduce((sum, row) => sum + Number(row.revenue ?? 0), 0)
    // Demo of compact formatting for huge counters (not from DB).
    const lifetimeImpressions = 12_847_320

    const base = ctx.basePath ?? '/demo'

    return [
      Stat.make('Total products', total)
        .description('In catalog')
        .color('primary')
        .url(`${base}/products`),
      Stat.make('Low stock', lowStock)
        .description('5 or fewer units')
        .color('warning')
        .chart([12, 9, 11, 8, 10, lowStock, 7]),
      Stat.make('Featured', featured)
        .description('Highlighted items')
        .color('success'),
      Stat.make('Visits (30d)', formatCompactNumber(visits30d))
        .description(`${visits30d.toLocaleString('en')} raw`)
        .color('info')
        .chart(metrics.slice(-7).map((row) => Number(row.visits ?? 0))),
      Stat.make('Impressions', formatCompactNumber(lifetimeImpressions))
        .description(`${formatCompactNumber(revenue30d)} revenue · 30d`)
        .color('gray')
        .chart([2.1, 2.4, 2.8, 3.1, 3.6, 4.2, 4.9].map((n) => Math.round(n * 1_000_000))),
    ]
  }
}

export class RecentProductsWidget extends ListWidget {
  static override sort = 40
  static override columnSpan = 2
  static override heading = 'Recent products'

  static override columns() {
    return [
      { label: 'SKU', attribute: 'sku' },
      { label: 'Name', attribute: 'name' },
      { label: 'Price', attribute: 'price' },
    ]
  }

  static override async records(ctx: WidgetRequestContext) {
    const base = ctx.basePath ?? '/demo'
    const items = await Product.find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean()

    return items.map((item) => ({
      sku: item.sku,
      name: item.name,
      price: item.price != null ? `$${Number(item.price).toFixed(2)}` : '—',
      url: `${base}/products/${String(item._id)}`,
    }))
  }
}

export class ProductStockChartWidget extends ChartWidget {
  static override sort = 20
  static override columnSpan = 1
  static override heading = 'Stock by product'

  static override type() {
    return 'bar' as const
  }

  static override library() {
    return 'apex' as const
  }

  static override async data(_ctx: WidgetRequestContext) {
    const items = await Product.find().sort({ stock: -1 }).limit(6).lean()
    return {
      labels: items.map((item) => item.name),
      datasets: [
        {
          label: 'Stock',
          data: items.map((item) => Number(item.stock ?? 0)),
        },
      ],
    }
  }
}

export class FeaturedMixDonutChartWidget extends ChartWidget {
  static override sort = 21
  static override columnSpan = 1
  static override heading = 'Catalog mix'

  static override type() {
    return 'donut' as const
  }

  static override library() {
    return 'apex' as const
  }

  static override async data(_ctx: WidgetRequestContext) {
    const [featured, lowStock, standard] = await Promise.all([
      Product.countDocuments({ featured: true }),
      Product.countDocuments({ featured: { $ne: true }, stock: { $lte: 5 } }),
      Product.countDocuments({ featured: { $ne: true }, stock: { $gt: 5 } }),
    ])

    return {
      labels: ['Featured', 'Low stock', 'Standard'],
      datasets: [{ label: 'Products', data: [featured, lowStock, standard] }],
    }
  }
}

export class VisitsLineChartWidget extends ChartWidget {
  static override sort = 22
  static override columnSpan = 1
  static override heading = 'Daily visits (30 days)'

  static override type() {
    return 'line' as const
  }

  static override library() {
    return 'apex' as const
  }

  static override async data(_ctx: WidgetRequestContext) {
    const rows = await loadDailyMetrics(30)
    return {
      labels: rows.map((row) => formatDayLabel(new Date(row.date))),
      datasets: [
        {
          label: 'Visits',
          data: rows.map((row) => Number(row.visits ?? 0)),
        },
      ],
    }
  }
}

export class RevenueAreaChartWidget extends ChartWidget {
  static override sort = 23
  static override columnSpan = 2
  static override heading = 'Daily revenue (30 days)'

  static override type() {
    return 'area' as const
  }

  static override library() {
    return 'apex' as const
  }

  static override async data(_ctx: WidgetRequestContext) {
    const rows = await loadDailyMetrics(30)
    return {
      labels: rows.map((row) => formatDayLabel(new Date(row.date))),
      datasets: [
        {
          label: 'Revenue (USD)',
          data: rows.map((row) => Number(row.revenue ?? 0)),
        },
      ],
    }
  }
}

export class TrafficSourcesPieChartWidget extends ChartWidget {
  static override sort = 25
  static override columnSpan = 1
  static override heading = 'Traffic sources'

  static override type() {
    return 'pie' as const
  }

  static override library() {
    return 'apex' as const
  }

  static override async data(_ctx: WidgetRequestContext) {
    const sources = await TrafficSource.find().sort({ sort: 1 }).lean()
    return {
      labels: sources.map((source) => source.name),
      datasets: [
        {
          label: 'Sessions',
          data: sources.map((source) => Number(source.sessions ?? 0)),
        },
      ],
    }
  }
}

export class TopPricesChartJsWidget extends ChartWidget {
  static override sort = 24
  static override columnSpan = 1
  static override heading = 'Top prices (Chart.js)'

  static override type() {
    return 'bar' as const
  }

  static override library() {
    return 'chartjs' as const
  }

  static override async data(_ctx: WidgetRequestContext) {
    const items = await Product.find()
      .sort({ price: -1 })
      .limit(6)
      .select('name price')
      .lean()

    return {
      labels: items.map((item) => item.name),
      datasets: [
        {
          label: 'Price (USD)',
          data: items.map((item) => Number(item.price ?? 0)),
          color: '#286291',
        },
      ],
    }
  }
}

export class PlaygroundNavigationWidget extends NavigationCardsWidget {
  static override sort = 1000
}
