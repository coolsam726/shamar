import type { FieldConfig } from '@shamar/core';
import {
  dehydrateField,
  emptyFieldValue,
  FIELD_ABSENT,
  FIELD_SKIP,
} from '@shamar/core';

export {
  asRepeaterItems,
  toKeyValuePairs,
  keyValuePairsToRecord,
} from '@shamar/core';

export function fieldStateRef(name: string, bindRoot?: string | null): string {
  const key = alpineQuote(name ?? '');
  if (bindRoot) return `${bindRoot}[${key}]`;
  return `state[${key}]`;
}

function alpineQuote(name: string): string {
  return `'${String(name).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/**
 * Parse a POST/JSON body value for a field using its registered dehydrator.
 * Returns `undefined` when the key is absent (caller should skip).
 */
export function parseFieldPayload(
  field: FieldConfig,
  input: Record<string, unknown>,
): unknown | undefined {
  const value = dehydrateField(field, input);
  return value === FIELD_ABSENT ? undefined : value;
}

export function defaultFormValue(field: FieldConfig): unknown {
  const value = emptyFieldValue(field);
  return value === FIELD_SKIP ? undefined : value;
}
