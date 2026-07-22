import type { DataAdapter, FieldConfig, ResourceMeta, UniqueOptions } from './types.js';

export class ValidationException extends Error {
  readonly errors: Record<string, string>;

  constructor(errors: Record<string, string>) {
    const first = Object.values(errors)[0] ?? 'Validation failed';
    super(first);
    this.name = 'ValidationException';
    this.errors = errors;
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
  return value == null || value === '';
}

function fieldLabel(field: FieldConfig): string {
  if (typeof field.label === 'string' && field.label.trim()) {
    return field.label;
  }
  return field.name.charAt(0).toUpperCase() + field.name.slice(1);
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
