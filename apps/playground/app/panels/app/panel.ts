import { PanelProvider, panel } from '@shamar/adonis'
import AppWelcomePage from '#pages/app/welcome_page'

/**
 * Minimal second panel at `/app` — multi-panel illustration for the public demo.
 */
export default class AppPanel extends PanelProvider {
  panel() {
    return panel('app')
      .path('/app')
      .branding({
        name: 'App panel',
        logo: '/branding/shamar-banner.svg',
        logoDark: '/branding/shamar-banner-dark.svg',
        primaryColor: '#286291',
        accentColor: '#F1511B',
        logoHeight: 60,
      })
      .brandDisplay('logo')
      .contentMaxWidth('screen-xl')
      .dashboardPage(AppWelcomePage)
      .discoverResources('app/panels/app/resources')
      .discoverPages('app/panels/app/pages')
      .userMenuLinks([
        { label: 'Admin panel', href: '/' },
        { label: 'shamar.dev', href: 'https://shamar.dev', external: true },
      ])
  }
}
