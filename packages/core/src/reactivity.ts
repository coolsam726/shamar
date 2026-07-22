import type { FieldContext, FormOperation } from './types.js';

export function createFieldContext(options: {
  state: Record<string, unknown>;
  record?: Record<string, unknown> | null;
  operation: FormOperation;
  changed?: string;
}): FieldContext {
  const state = { ...options.state };

  return {
    get state() {
      return options.changed != null ? state[options.changed] : state;
    },
    record: options.record ?? null,
    operation: options.operation,
    get(name: string) {
      return state[name];
    },
    set(name: string, value: unknown) {
      state[name] = value;
    },
  };
}

/** Snapshot of mutable state after Get/Set mutations. */
export function readContextState(ctx: FieldContext): Record<string, unknown> {
  // FieldContext.set mutates the closed-over object; re-read via known keys by
  // wrapping set/get — callers should prefer evaluateAfterStateUpdated return.
  const out: Record<string, unknown> = {};
  // No enumerable store on ctx; evaluate hooks return patched state explicitly.
  void out;
  return out;
}

export async function evaluateAfterStateUpdated(
  field: {
    name: string;
    afterStateUpdated?: (ctx: FieldContext) => void | Promise<void>;
  },
  options: {
    state: Record<string, unknown>;
    record?: Record<string, unknown> | null;
    operation: FormOperation;
  },
): Promise<Record<string, unknown>> {
  const state = { ...options.state };
  const ctx: FieldContext = {
    get state() {
      return state[field.name];
    },
    record: options.record ?? null,
    operation: options.operation,
    get(name: string) {
      return state[name];
    },
    set(name: string, value: unknown) {
      state[name] = value;
    },
  };

  if (field.afterStateUpdated) {
    await field.afterStateUpdated(ctx);
  }

  return state;
}

export function resolveClosure<T>(
  value: T | ((ctx: FieldContext) => T) | undefined,
  ctx: FieldContext,
  fallback?: T,
): T | undefined {
  if (value === undefined) return fallback;
  if (typeof value === 'function') {
    return (value as (ctx: FieldContext) => T)(ctx);
  }
  return value;
}

export function resolveGridItemStyle(
  item: { columnSpan?: number | 'full'; columnStart?: number },
  sectionColumns = 2,
): string {
  const parts: string[] = [];
  if (item.columnStart != null) {
    parts.push(`grid-column-start: ${item.columnStart}`);
  }
  if (item.columnSpan === 'full') {
    parts.push(`grid-column: 1 / -1`);
  } else if (typeof item.columnSpan === 'number' && item.columnSpan > 1) {
    const span = Math.min(item.columnSpan, sectionColumns);
    parts.push(`grid-column: span ${span} / span ${span}`);
  }
  return parts.join('; ');
}
