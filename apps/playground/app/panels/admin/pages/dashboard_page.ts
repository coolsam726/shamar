import { DashboardPage } from '@shamar/core'
import {
  ProductStatsWidget,
  ProductStockChartWidget,
  FeaturedMixDonutChartWidget,
  VisitsLineChartWidget,
  RevenueAreaChartWidget,
  TopPricesChartJsWidget,
  TrafficSourcesPieChartWidget,
  RecentProductsWidget,
  PlaygroundNavigationWidget,
} from '#widgets/admin/dashboard_widgets'

export default class AdminDashboard extends DashboardPage {
  static override columns = 3

  static override widgets() {
    return [
      ProductStatsWidget,
      ProductStockChartWidget,
      FeaturedMixDonutChartWidget,
      VisitsLineChartWidget,
      RevenueAreaChartWidget,
      TopPricesChartJsWidget,
      TrafficSourcesPieChartWidget,
      RecentProductsWidget,
      PlaygroundNavigationWidget,
    ]
  }
}
