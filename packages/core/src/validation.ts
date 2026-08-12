import type { DataAdapter, FieldConfig, ResourceMeta, UniqueOptions } from './types.js';
import { humanizeLabel } from './labels.js';
import { createFieldContext, resolveClosure } from './reactivity.js';
import { repeaterSchema, widgetNumber } from './fields.js';

export class ValidationException extends Error {
  readonly errors: Record<string, string>;

  constructor(errors: Record<string, string>) {
    const first = Object.values(errors)[0] ?? 'Validation failed';
    super(first);
    this.name = 'ValidationException';
    this.errors = errors;
  }
}

/** Duck-type safe across duplicate package copies in a monorepo. */
export function isValidationException(error: unknown): error is ValidationException {
  if (error instanceof ValidationException) return true;
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { name?: unknown; errors?: unknown };
  return (
    candidate.name === 'ValidationException' &&
    typeof candidate.errors === 'object' &&
    candidate.errors !== null &&
    !Array.isArray(candidate.errors)
  );
}

/**
 * Absolute http(s) URLs, plus path-absolute URLs used by the media library
 * (e.g. `/admin/media/files/:id/raw`).
 */
export function isValidUrlValue(value: string): boolean {
  const str = value.trim();
  if (!str) return false;
  if (str.startsWith('/') && !str.startsWith('//')) {
    // Path-absolute (same-origin media / asset paths).
    return !/\s/.test(str);
  }
  try {
    const parsed = new URL(str);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function resolveUniqueOptions(field: FieldConfig): UniqueOptions | null {
  if (!field.unique) return null;
  if (field.unique === true) {
    return { ignoreRecord: true };
  }
  return {
    ignoreRecord: true,
    ...field.unique,
  };
}

function isBlank(value: unknown): boolean {
  if (value == null || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') {
    if (value instanceof Date) return Number.isNaN(value.getTime());
    return Object.keys(value as object).length === 0;
  }
  return false;
}

function isBlankHtml(value: unknown): boolean {
  const text = String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return !text;
}

function fieldLabel(field: FieldConfig): string {
  if (typeof field.label === 'string' && field.label.trim()) {
    return field.label;
  }
  return humanizeLabel(field.name);
}

function asString(value: unknown): string {
  return value == null ? '' : String(value);
}

/**
 * Validate Filament-style length / value / pattern constraints (and required).
 * Skips fields that are not visible; resolves `required` closures against state.
 */
export function validateFieldConstraints(
  meta: ResourceMeta,
  data: Record<string, unknown>,
  options: { recordId?: string } = {},
): void {
  const errors: Record<string, string> = {};
  const isEdit = Boolean(options.recordId);

  for (const field of meta.fields) {
    if (field.hiddenOnForm) continue;
    if (field.dehydrated === false) continue;
    if (isEdit && field.createOnly) continue;

    const ctx = createFieldContext({
      state: data,
      record: null,
      operation: isEdit ? 'edit' : 'create',
    });
    const visible = resolveClosure(field.visible, ctx, true) ?? true;
    if (!visible) continue;

    const required = Boolean(resolveClosure(field.required, ctx, false));
    const raw = data[field.name];
    const label = fieldLabel(field);

    if (!(field.name in data) && !required) continue;

    const blank =
      field.type === 'richEditor' ? isBlankHtml(raw) || isBlank(raw) : isBlank(raw);

    if (required && blank) {
      errors[field.name] = `The ${label} field is required.`;
      continue;
    }

    if (field.type === 'repeater') {
      const items = Array.isArray(raw) ? raw : [];
      const minItems = widgetNumber(field, 'minItems');
      const maxItems = widgetNumber(field, 'maxItems');
      if (minItems != null && items.length < minItems) {
        errors[field.name] = `The ${label} must have at least ${minItems} ${minItems === 1 ? 'item' : 'items'}.`;
        continue;
      }
      if (maxItems != null && items.length > maxItems) {
        errors[field.name] = `The ${label} must not have more than ${maxItems} ${maxItems === 1 ? 'item' : 'items'}.`;
        continue;
      }
      const nested = repeaterSchema(field);
      if (nested) {
        for (let index = 0; index < items.length; index += 1) {
          const item = items[index];
          const record = item && typeof item === 'object' && !Array.isArray(item)
            ? (item as Record<string, unknown>)
            : {};
          for (const child of nested.fields) {
            if (child.dehydrated === false) continue;
            const childRequired = Boolean(resolveClosure(child.required, ctx, false));
            if (!childRequired) continue;
            const childRaw = record[child.name];
            const childBlank =
              child.type === 'richEditor' ? isBlankHtml(childRaw) || isBlank(childRaw) : isBlank(childRaw);
            if (childBlank) {
              errors[field.name] = `The ${fieldLabel(child)} field is required.`;
              break;
            }
          }
          if (errors[field.name]) break;
        }
      }
      if (errors[field.name]) continue;
      if (blank) continue;
    }

    if (blank) continue;

    const str = asString(raw);

    if (field.minLength != null && str.length < field.minLength) {
      errors[field.name] = `The ${label} must be at least ${field.minLength} characters.`;
      continue;
    }
    if (field.maxLength != null && str.length > field.maxLength) {
      errors[field.name] = `The ${label} must not be greater than ${field.maxLength} characters.`;
      continue;
    }
    if (field.length != null && str.length !== field.length) {
      errors[field.name] = `The ${label} must be ${field.length} characters.`;
      continue;
    }

    if (field.pattern) {
      try {
        const re = new RegExp(`^(?:${field.pattern})$`);
        if (!re.test(str)) {
          errors[field.name] = `The ${label} format is invalid.`;
          continue;
        }
      } catch {
        // Invalid pattern in resource config — skip rather than crash.
      }
    }

    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
      errors[field.name] = `The ${label} must be a valid email address.`;
      continue;
    }

    if (field.type === 'url') {
      if (!isValidUrlValue(str)) {
        errors[field.name] = `The ${label} must be a valid URL.`;
        continue;
      }
    }

    if (
      field.type === 'number' ||
      field.type === 'slider' ||
      field.type === 'rating' ||
      field.minValue != null ||
      field.maxValue != null
    ) {
      const num = typeof raw === 'number' ? raw : Number(str);
      if (
        (field.type === 'number' || field.type === 'slider' || field.type === 'rating') &&
        Number.isNaN(num)
      ) {
        errors[field.name] = `The ${label} must be a number.`;
        continue;
      }
      if (!Number.isNaN(num)) {
        if (field.minValue != null && typeof field.minValue === 'number' && num < field.minValue) {
          errors[field.name] = `The ${label} must be at least ${field.minValue}.`;
          continue;
        }
        if (field.maxValue != null && typeof field.maxValue === 'number' && num > field.maxValue) {
          errors[field.name] = `The ${label} must not be greater than ${field.maxValue}.`;
          continue;
        }
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationException(errors);
  }
}

/**
 * Validate Filament-style `.unique()` constraints before create/update.
 */
export async function validateUniqueFields(
  meta: ResourceMeta,
  data: Record<string, unknown>,
  adapter: DataAdapter,
  options: { recordId?: string } = {},
): Promise<void> {
  const errors: Record<string, string> = {};

  for (const field of meta.fields) {
    const unique = resolveUniqueOptions(field);
    if (!unique) continue;
    if (!(field.name in data)) continue;

    const ctx = createFieldContext({
      state: data,
      record: null,
      operation: options.recordId ? 'edit' : 'create',
    });
    const visible = resolveClosure(field.visible, ctx, true) ?? true;
    if (!visible) continue;

    const value = data[field.name];
    if (isBlank(value)) continue;

    const column = unique.column ?? field.name;
    const excludeId =
      unique.ignoreRecord !== false && options.recordId ? options.recordId : undefined;

    const taken = await adapter.exists(meta, column, value, { excludeId });
    if (taken) {
      errors[field.name] =
        unique.message ?? `The ${fieldLabel(field)} has already been taken.`;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationException(errors);
  }
}

/**
 * Run required/length/pattern checks then uniqueness.
 */
export async function validateFormData(
  meta: ResourceMeta,
  data: Record<string, unknown>,
  adapter: DataAdapter,
  options: { recordId?: string } = {},
): Promise<void> {
  validateFieldConstraints(meta, data, options);
  await validateUniqueFields(meta, data, adapter, options);
}
