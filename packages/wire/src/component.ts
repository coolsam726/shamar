/**
 * Public state for a Wire component. Only keys present on `data` are
 * accepted from the browser.
 */
export interface WireEffects {
  /** Full URL or path. The browser navigates after this response. */
  redirect?: string;
}

export interface WireComponent {
  data: Record<string, unknown>;
  /** Response-only effects. Not stored in the signed snapshot. */
  effects?: WireEffects;
  updating?(key: string, value: unknown): Promise<void> | void;
  /** Called after a public property changes. */
  updated?(key: string): Promise<void> | void;
  /** Called for `wire:click` style actions. */
  call?(method: string, params: unknown[]): Promise<void> | void;
}

const BLOCKED = new Set([
  'data',
  'updated',
  'call',
  'constructor',
  'hydrate',
  'dehydrate',
  'render',
]);

export function applyUpdates(component: WireComponent, updates: Record<string, unknown> | undefined): string[] {
  if (!updates) return [];
  const changed: string[] = [];
  for (const [key, value] of Object.entries(updates)) {
    if (!(key in component.data) || BLOCKED.has(key)) continue;
    component.data[key] = value;
    changed.push(key);
  }
  return changed;
}

export async function invokeMethod(
  component: WireComponent,
  method: string,
  params: unknown[] = [],
): Promise<void> {
  if (!method || BLOCKED.has(method) || method.startsWith('_')) {
    throw new Error(`Unknown wire method: ${method}`);
  }
  const target = component as unknown as Record<string, unknown>;
  const fn = target[method];
  if (typeof fn !== 'function') throw new Error(`Unknown wire method: ${method}`);
  await fn.apply(component, params);
}
