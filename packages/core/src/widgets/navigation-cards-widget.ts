import { Widget } from '../widget.js';
import type { WidgetClass } from '../widget.js';

/**
 * Built-in widget that renders panel navigation roots as link cards.
 * Data (`menuRoots`) is injected by the Adonis host at render time.
 */
export class NavigationCardsWidget extends Widget {
  static override sort = 1000;
  static override columnSpan: number | 'full' = 'full';
}

export function isNavigationCardsWidget(value: WidgetClass): value is typeof NavigationCardsWidget {
  let current: unknown = value;
  while (typeof current === 'function') {
    if (current === NavigationCardsWidget) return true;
    current = Object.getPrototypeOf(current);
  }
  return false;
}
