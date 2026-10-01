import { PanelProvider, panel } from '@shamar/adonis'

/** Second panel, mounted at `/app`. */
export default class AppPanel extends PanelProvider {
  panel() {
    return panel('app')
      .path('/app')
      .branding({
        name: 'SHAMAR APP',
        logo: '/branding/shamar-logo.svg',
        logoDark: '/branding/shamar-logo-dark.svg',
        logoHeight: 32,
      })
      .brandDisplay('both')
      .discoverResources('app/panels/app/resources')
  }
}
