import {
  CardWidget,
  DashboardPage,
  NavigationCardsWidget,
  type WidgetRequestContext,
} from '@shamar/core'

/** Short intro card explaining this is the second demo panel. */
class AppPanelIntroWidget extends CardWidget {
  static override sort = 1
  static override columnSpan: 'full' = 'full'
  static override heading = 'Minimal second panel'

  static override content(_ctx: WidgetRequestContext) {
    return {
      html: `
        <p>This <strong>App panel</strong> is mounted at <code>/app</code> to show multi-panel support.</p>
        <p class="mt-2">Use the avatar menu to switch back to the Admin panel or return to
          <a href="https://shamar.dev" target="_blank" rel="noopener noreferrer" class="text-fg-brand hover:underline">shamar.dev</a>.
        </p>
      `,
    }
  }
}

/** Lean dashboard for the `/app` demo panel. */
export default class AppWelcomePage extends DashboardPage {
  static override label = 'App panel'
  static override columns = 1

  static override widgets() {
    return [AppPanelIntroWidget, NavigationCardsWidget]
  }
}
