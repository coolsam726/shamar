import type { FieldConfig, FieldType, FormSchema } from './types.js';
import {
  asBoolean,
  asNumber,
  asRepeaterItems,
  dehydrateStringList,
  fieldInputRaw,
  keyValuePairsToRecord,
  parseCurrencyInput,
  parseJsonValue,
  toFormDateInputValue,
  toKeyValuePairs,
} from './field-values.js';

/**
 * How a field dehydrates into form state / request payload.
 * Hosts use this to parse POST bodies and seed Alpine state.
 */
export type FieldValueKind =
  | 'scalar'
  | 'number'
  | 'boolean'
  | 'array'
  | 'record'
  | 'nested'
  | 'html'
  | 'json';

/** Omit this key from the dehydrated payload (field was not in the request). */
export const FIELD_ABSENT: unique symbol = Symbol('shamar.fieldAbsent');

/** Omit this key from Alpine form state (another widget owns it). */
export const FIELD_SKIP: unique symbol = Symbol('shamar.fieldSkip');

export type FieldValueHost = Pick<FieldConfig, 'type'> & Partial<FieldConfig>;

export interface FieldTypeDefinition {
  type: string;
  valueKind?: FieldValueKind;
  /** Hint for native `<input type>` when no custom view is registered. */
  inputType?: string;
  /** Human label for docs / field galleries. */
  label?: string;
  /** Stored / adapter value → Alpine form state. */
  hydrate?: (value: unknown, field: FieldValueHost) => unknown;
  /**
   * Request body → stored value.
   * Return {@link FIELD_ABSENT} to leave the key off the payload.
   */
  dehydrate?: (field: FieldConfig, input: Record<string, unknown>) => unknown;
  /**
   * Empty form state when there is no record value or static default.
   * Return {@link FIELD_SKIP} to omit the key (e.g. belongsTo combobox).
   */
  empty?: (field: FieldValueHost) => unknown;
}

const definitions = new Map<string, FieldTypeDefinition>();

/** Register or replace a field type (built-in or host-defined). Merges with any existing definition. */
export function registerFieldType(definition: FieldTypeDefinition): void {
  const type = String(definition.type ?? '').trim();
  if (!type) throw new Error('registerFieldType: type is required');
  const existing = definitions.get(type);
  definitions.set(type, { ...existing, ...definition, type });
}

export function getFieldType(type: string): FieldTypeDefinition | undefined {
  return definitions.get(type);
}

export function listFieldTypes(): FieldTypeDefinition[] {
  return [...definitions.values()];
}

export function fieldValueKind(type: string): FieldValueKind {
  return getFieldType(type)?.valueKind ?? 'scalar';
}

export function isArrayFieldType(type: string): boolean {
  const kind = fieldValueKind(type);
  return kind === 'array' || kind === 'nested';
}

export function isJsonFieldType(type: string): boolean {
  const kind = fieldValueKind(type);
  return kind === 'json' || kind === 'nested' || kind === 'record';
}

function widgetNumber(field: FieldValueHost, key: string): number | undefined {
  const value = field.widget?.[key];
  return typeof value === 'number' ? value : undefined;
}

function isArrayValued(field: FieldValueHost): boolean {
  if (field.multiple) return true;
  const kind = fieldValueKind(field.type);
  if (kind === 'array' || kind === 'nested') return true;
  if (field.relation && field.relation.kind !== 'belongsTo') return true;
  return false;
}

function dehydrateIfPresent(field: FieldConfig, input: Record<string, unknown>): unknown {
  const { present, raw } = fieldInputRaw(field, input);
  return present ? raw : FIELD_ABSENT;
}

function dehydrateList(field: FieldConfig, input: Record<string, unknown>, commaSplit = false): unknown {
  const { present, raw } = fieldInputRaw(field, input);
  if (!present) return FIELD_ABSENT;
  return dehydrateStringList(raw, commaSplit);
}

function hydrateNumericRange(value: unknown, field: FieldValueHost): number {
  const fallback = typeof field.minValue === 'number' ? field.minValue : Number(field.minValue ?? 0);
  const min = Number.isFinite(fallback) ? fallback : 0;
  if (value == null || value === '') return min;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : min;
}

function hydrateNumber(value: unknown, field: FieldValueHost): unknown {
  if (field.currency) {
    if (value == null || value === '') return '';
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : value;
  }
  if (value == null || value === '') return '';
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : value;
}

function dehydrateNumber(field: FieldConfig, input: Record<string, unknown>): unknown {
  const { present, raw } = fieldInputRaw(field, input);
  if (!present) return FIELD_ABSENT;
  if (field.currency) return parseCurrencyInput(raw);
  return asNumber(raw);
}

function dehydrateBoolean(field: FieldConfig, input: Record<string, unknown>): boolean {
  const { raw } = fieldInputRaw(field, input);
  return asBoolean(raw);
}

function dehydrateNested(field: FieldConfig, input: Record<string, unknown>): unknown {
  const { present, raw } = fieldInputRaw(field, input);
  if (!present) return FIELD_ABSENT;
  return asRepeaterItems(parseJsonValue(raw) ?? raw);
}

function dehydrateRecord(field: FieldConfig, input: Record<string, unknown>): unknown {
  const { present, raw } = fieldInputRaw(field, input);
  if (!present) return FIELD_ABSENT;
  return keyValuePairsToRecord(parseJsonValue(raw) ?? raw);
}

function dehydrateJson(field: FieldConfig, input: Record<string, unknown>): unknown {
  const { present, raw } = fieldInputRaw(field, input);
  if (!present) return FIELD_ABSENT;
  return parseJsonValue(raw) ?? raw;
}

function hydrateSelect(value: unknown, field: FieldValueHost): unknown {
  if (!field.multiple) return value;
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (value == null || value === '') return [];
  return [String(value)];
}

function hydrateArray(value: unknown): unknown {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function emptyRepeater(field: FieldValueHost): unknown[] {
  const count = widgetNumber(field, 'defaultItems') ?? 0;
  const schema = field.widget?.schema as FormSchema | undefined;
  if (count > 0 && schema && Array.isArray(schema.fields)) {
    return Array.from({ length: count }, () => emptyRepeaterItem(schema));
  }
  return [];
}

function emptyRelation(field: FieldValueHost): unknown {
  if (field.relation?.kind === 'belongsTo') return FIELD_SKIP;
  if (isArrayValued(field)) return [];
  return '';
}

function dehydrateRelation(field: FieldConfig, input: Record<string, unknown>): unknown {
  if (isArrayValued(field)) return dehydrateList(field, input);
  return dehydrateIfPresent(field, input);
}

function dehydrateByKind(field: FieldConfig, input: Record<string, unknown>, kind: FieldValueKind): unknown {
  if (field.currency) {
    const { present, raw } = fieldInputRaw(field, input);
    if (!present) return FIELD_ABSENT;
    return parseCurrencyInput(raw);
  }
  if (field.multiple || kind === 'array') return dehydrateList(field, input, field.type === 'tags');
  if (kind === 'boolean') return dehydrateBoolean(field, input);
  if (kind === 'number') return dehydrateNumber(field, input);
  if (kind === 'nested') return dehydrateNested(field, input);
  if (kind === 'record') return dehydrateRecord(field, input);
  if (kind === 'json') return dehydrateJson(field, input);
  return dehydrateIfPresent(field, input);
}

function hydrateByKind(value: unknown, field: FieldValueHost, kind: FieldValueKind): unknown {
  if (field.currency) return hydrateNumber(value, field);
  if (kind === 'number') return hydrateNumber(value, field);
  if (kind === 'nested') return asRepeaterItems(value);
  if (kind === 'record') return toKeyValuePairs(value);
  if (kind === 'array' || field.multiple) return hydrateArray(value);
  return value;
}

function emptyByKind(field: FieldValueHost, kind: FieldValueKind): unknown {
  if (kind === 'boolean') return false;
  if (kind === 'number') return '';
  if (kind === 'nested' || kind === 'record' || kind === 'array' || field.multiple) return [];
  return '';
}

/** Stored / adapter value → Alpine form state. */
export function hydrateField(field: FieldValueHost, value: unknown): unknown {
  const definition = getFieldType(field.type);
  if (definition?.hydrate) return definition.hydrate(value, field);
  return hydrateByKind(value, field, definition?.valueKind ?? 'scalar');
}

/**
 * Request body → stored value.
 * Returns {@link FIELD_ABSENT} when the field should be omitted from the payload.
 */
export function dehydrateField(field: FieldConfig, input: Record<string, unknown>): unknown {
  if (field.currency) {
    const { present, raw } = fieldInputRaw(field, input);
    if (!present) return FIELD_ABSENT;
    return parseCurrencyInput(raw);
  }
  const definition = getFieldType(field.type);
  if (definition?.dehydrate) return definition.dehydrate(field, input);
  return dehydrateByKind(field, input, definition?.valueKind ?? 'scalar');
}

/** Empty form state when there is no record value or static default. */
export function emptyFieldValue(field: FieldValueHost): unknown {
  const definition = getFieldType(field.type);
  if (definition?.empty) return definition.empty(field);
  return emptyByKind(field, definition?.valueKind ?? 'scalar');
}

/**
 * Seed Alpine state for one field from a record (or filled page data).
 * Returns {@link FIELD_SKIP} when the field should not be written.
 */
export function fieldFormState(
  field: FieldConfig,
  source: Record<string, unknown> | null | undefined,
): unknown {
  if (source && field.name in source) {
    return hydrateField(field, source[field.name]);
  }
  if (field.default !== undefined && typeof field.default !== 'function') {
    return hydrateField(field, field.default);
  }
  return emptyFieldValue(field);
}

export function assignFieldFormState(
  state: Record<string, unknown>,
  field: FieldConfig,
  source: Record<string, unknown> | null | undefined,
): void {
  const value = fieldFormState(field, source);
  if (value !== FIELD_SKIP) state[field.name] = value;
}

export function emptyRepeaterItem(schema: Pick<FormSchema, 'fields'>): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  for (const field of schema.fields) {
    const value = emptyFieldValue(field);
    if (value !== FIELD_SKIP) item[field.name] = value;
  }
  return item;
}

function define(type: FieldType, extra: Omit<FieldTypeDefinition, 'type'> = {}): void {
  registerFieldType({ type, ...extra });
}

define('text', { label: 'Text' });
define('textarea', { label: 'Textarea' });
define('number', {
  label: 'Number',
  valueKind: 'number',
  inputType: 'number',
  hydrate: hydrateNumber,
  dehydrate: dehydrateNumber,
  empty: () => '',
});
define('boolean', {
  label: 'Toggle',
  valueKind: 'boolean',
  dehydrate: dehydrateBoolean,
  empty: () => false,
});
define('checkbox', {
  label: 'Checkbox',
  valueKind: 'boolean',
  dehydrate: dehydrateBoolean,
  empty: () => false,
});
define('date', {
  label: 'Date',
  inputType: 'date',
  hydrate: (value) => toFormDateInputValue(value, 'date'),
});
define('datetime', {
  label: 'Date & time',
  inputType: 'datetime-local',
  hydrate: (value) => toFormDateInputValue(value, 'datetime'),
});
define('time', {
  label: 'Time',
  inputType: 'time',
  hydrate: (value) => toFormDateInputValue(value, 'time'),
});
define('week', {
  label: 'Week',
  inputType: 'date',
  hydrate: (value) => toFormDateInputValue(value, 'date'),
});
define('month', {
  label: 'Month',
  inputType: 'month',
  hydrate: (value) => {
    if (value == null || value === '') return '';
    const str = String(value).trim();
    const ym = /^(\d{4})-(\d{2})$/.exec(str);
    if (ym) return `${ym[1]}-${ym[2]}`;
    const date = toFormDateInputValue(value, 'date');
    return date.length >= 7 ? date.slice(0, 7) : date;
  },
  dehydrate: (field, input) => {
    const { present, raw } = fieldInputRaw(field, input);
    if (!present) return FIELD_ABSENT;
    const str = String(raw ?? '').trim();
    if (!str) return FIELD_ABSENT;
    const ym = /^(\d{4})-(\d{2})$/.exec(str);
    if (ym) return `${ym[1]}-${ym[2]}-01`;
    const date = toFormDateInputValue(str, 'date');
    return date || str;
  },
});
define('select', {
  label: 'Select',
  hydrate: hydrateSelect,
  dehydrate: (field, input) =>
    field.multiple ? dehydrateList(field, input) : dehydrateIfPresent(field, input),
  empty: (field) => (field.multiple ? [] : ''),
});
define('relation', {
  label: 'Relation',
  dehydrate: dehydrateRelation,
  empty: emptyRelation,
});
define('email', { label: 'Email', inputType: 'email' });
define('password', { label: 'Password', inputType: 'password' });
define('tel', { label: 'Phone', inputType: 'tel' });
define('url', { label: 'URL' });
define('file', { label: 'File', inputType: 'file' });
define('image', { label: 'Image', inputType: 'file' });
define('filePicker', { label: 'Media picker' });
define('hidden', { label: 'Hidden', inputType: 'hidden' });
define('radio', { label: 'Radio' });
define('color', {
  label: 'Color',
  inputType: 'color',
  hydrate: (value) => (value == null || value === '' ? '#000000' : value),
  empty: () => '#000000',
});
define('tags', {
  label: 'Tags',
  valueKind: 'array',
  hydrate: hydrateArray,
  dehydrate: (field, input) => dehydrateList(field, input, true),
  empty: () => [],
});
define('checkboxList', {
  label: 'Checkbox list',
  valueKind: 'array',
  hydrate: hydrateArray,
  dehydrate: (field, input) => dehydrateList(field, input),
  empty: () => [],
});
define('relationTable', {
  label: 'Relation table',
  valueKind: 'array',
  hydrate: hydrateArray,
  dehydrate: (field, input) => dehydrateList(field, input),
  empty: () => [],
});
define('richEditor', { label: 'Rich editor', valueKind: 'html' });
define('markdownEditor', { label: 'Markdown editor' });
define('codeEditor', { label: 'Code editor' });
define('repeater', {
  label: 'Repeater',
  valueKind: 'nested',
  hydrate: (value) => asRepeaterItems(value),
  dehydrate: dehydrateNested,
  empty: emptyRepeater,
});
define('keyValue', {
  label: 'Key-value',
  valueKind: 'record',
  hydrate: (value) => toKeyValuePairs(value),
  dehydrate: dehydrateRecord,
  empty: () => [],
});
define('slider', {
  label: 'Slider',
  valueKind: 'number',
  inputType: 'range',
  hydrate: hydrateNumericRange,
  dehydrate: dehydrateNumber,
  empty: (field) => hydrateNumericRange(null, field),
});
define('rating', {
  label: 'Rating',
  valueKind: 'number',
  hydrate: hydrateNumericRange,
  dehydrate: dehydrateNumber,
  empty: (field) => hydrateNumericRange(null, field),
});
