import { PanelProvider, panel } from '@shamar/adonis'
import AdminDashboard from '#pages/admin/dashboard_page'

/**
 * Public demo panel. Discovered from `app/panels/admin/panel.ts`.
 * Auth, the database, and shared branding stay in `config/shamar.ts`.
 */
export default class AdminPanel extends PanelProvider {
  panel() {
    return panel('admin')
      .path('/')
      .branding({
        name: 'SHAMAR',
        logo: '/branding/shamar-banner.svg',
        logoDark: '/branding/shamar-banner-dark.svg',
        primaryColor: '#F1511B',
        accentColor: '#286291',
        logoHeight: 60,
      })
      .brandDisplay('logo')
      .contentMaxWidth('screen-2xl')
      .defaultPerPage(10)
      .dashboardPage(AdminDashboard)
      .discoverResources('app/panels/admin/resources')
      .discoverPages('app/panels/admin/pages')
      .userMenuLinks([
        { label: 'App panel', href: '/app' },
        { label: 'shamar.dev', href: 'https://shamar.dev', external: true },
      ])
  }
}
