import { Widget, type WidgetRequestContext } from '../widget.js';
import type { WidgetClass } from '../widget.js';

export interface CardWidgetContent {
  /** App or package Edge view path. */
  view?: string;
  data?: Record<string, unknown>;
  /** Raw HTML snippet (escaped by Edge unless marked safe). */
  html?: string;
}

/**
 * General-purpose card widget with custom Edge content or HTML.
 */
export abstract class CardWidget extends Widget {
  static content(
    _ctx: WidgetRequestContext,
  ): CardWidgetContent | Promise<CardWidgetContent> {
    return {};
  }
}

export function isCardWidget(value: WidgetClass): value is typeof CardWidget {
  let current: unknown = value;
  while (typeof current === 'function') {
    if (current === CardWidget) return true;
    current = Object.getPrototypeOf(current);
  }
  return false;
}
