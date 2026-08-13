import { Widget, type WidgetRequestContext } from '../widget.js';
import type { WidgetClass } from '../widget.js';

export interface ListWidgetColumn {
  label: string;
  /** Dot path on each record, e.g. `name` or `meta.status`. */
  attribute: string;
}

export interface ListWidgetRecord {
  [key: string]: unknown;
  url?: string;
}

/**
 * Card with a simple key/value or multi-column list.
 */
export abstract class ListWidget extends Widget {
  static columns(): ListWidgetColumn[] {
    return [];
  }

  static records(
    _ctx: WidgetRequestContext,
  ): ListWidgetRecord[] | Promise<ListWidgetRecord[]> {
    return [];
  }

  /** Max rows to show (default 5). */
  static limit = 5;
}

export function isListWidget(value: WidgetClass): value is typeof ListWidget {
  let current: unknown = value;
  while (typeof current === 'function') {
    if (current === ListWidget) return true;
    current = Object.getPrototypeOf(current);
  }
  return false;
}
