import type { DataAdapter, FieldConfig, ResourceMeta, UniqueOptions } from './types.js';
import { humanizeLabel } from './labels.js';
import { createFieldContext, resolveClosure } from './reactivity.js';

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
  return value == null || value === '' || (Array.isArray(value) && value.length === 0);
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

    if (required && isBlank(raw)) {
      errors[field.name] = `The ${label} field is required.`;
      continue;
    }

    if (isBlank(raw)) continue;

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
      try {
        // Require an absolute URL.
        new URL(str);
      } catch {
        errors[field.name] = `The ${label} must be a valid URL.`;
        continue;
      }
    }

    if (field.type === 'number' || field.minValue != null || field.maxValue != null) {
      const num = typeof raw === 'number' ? raw : Number(str);
      if (field.type === 'number' && Number.isNaN(num)) {
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
