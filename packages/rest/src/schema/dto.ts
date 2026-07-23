import type { OpenApiSchema } from '../types.js';

const DTO_BRAND = Symbol.for('shamar.rest.dto');

export interface DtoSchema {
  readonly [DTO_BRAND]: true;
  toOpenApi(): OpenApiSchema;
}

export interface DtoField extends OpenApiSchema {
  readonly __optional?: boolean;
}

function brand(schema: OpenApiSchema): DtoSchema {
  return {
    [DTO_BRAND]: true,
    toOpenApi: () => ({ ...schema }),
  };
}

export function isDtoSchema(value: unknown): value is DtoSchema {
  return Boolean(value && typeof value === 'object' && DTO_BRAND in value);
}

/** Mark a DTO property as optional (omitted from `required`). */
export function optional<T extends OpenApiSchema>(schema: T): T & { __optional: true } {
  return { ...schema, __optional: true };
}

export function string(
  options: Omit<OpenApiSchema, 'type'> & { format?: string } = {},
): OpenApiSchema {
  return { type: 'string', ...options };
}

export function number(options: Omit<OpenApiSchema, 'type'> = {}): OpenApiSchema {
  return { type: 'number', ...options };
}

export function integer(options: Omit<OpenApiSchema, 'type'> = {}): OpenApiSchema {
  return { type: 'integer', ...options };
}

export function boolean(options: Omit<OpenApiSchema, 'type'> = {}): OpenApiSchema {
  return { type: 'boolean', ...options };
}

export function literal(
  value: string | number | boolean,
  options: Omit<OpenApiSchema, 'type' | 'enum' | 'const'> = {},
): OpenApiSchema {
  const type = typeof value === 'string' ? 'string' : typeof value === 'number' ? 'number' : 'boolean';
  return { type, enum: [value], ...options };
}

export function enumOf(
  values: Array<string | number | boolean>,
  options: Omit<OpenApiSchema, 'enum'> = {},
): OpenApiSchema {
  const first = values[0];
  const type =
    typeof first === 'string' ? 'string' : typeof first === 'number' ? 'number' : 'boolean';
  return { type, enum: values, ...options };
}

export function array(
  items: OpenApiSchema | DtoSchema,
  options: Omit<OpenApiSchema, 'type' | 'items'> = {},
): OpenApiSchema {
  return {
    type: 'array',
    items: isDtoSchema(items) ? items.toOpenApi() : items,
    ...options,
  };
}

export function nullable(schema: OpenApiSchema | DtoSchema): OpenApiSchema {
  const base = isDtoSchema(schema) ? schema.toOpenApi() : schema;
  if (base.type) {
    const types = Array.isArray(base.type) ? base.type : [base.type];
    if (!types.includes('null')) {
      return { ...base, type: [...types, 'null'] };
    }
  }
  return { oneOf: [base, { type: 'null' }] };
}

export function record(
  valueSchema: OpenApiSchema | DtoSchema,
  options: Omit<OpenApiSchema, 'type' | 'additionalProperties'> = {},
): OpenApiSchema {
  return {
    type: 'object',
    additionalProperties: isDtoSchema(valueSchema) ? valueSchema.toOpenApi() : valueSchema,
    ...options,
  };
}

export interface DtoOptions {
  description?: string;
  additionalProperties?: boolean;
  /**
   * Explicit required keys. Default: every property not wrapped in `optional()`.
   */
  required?: string[];
}

/**
 * Response / payload DTO helper. Compiles to an OpenAPI object schema.
 *
 * @example
 * const UserDto = dto({
 *   id: string(),
 *   email: string({ format: 'email' }),
 *   name: optional(nullable(string())),
 * })
 */
export function dto(
  properties: Record<string, OpenApiSchema | DtoSchema>,
  options: DtoOptions = {},
): DtoSchema {
  const resolved: Record<string, OpenApiSchema> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(properties)) {
    const schema = isDtoSchema(value) ? value.toOpenApi() : { ...value };
    const isOptional = Boolean((schema as DtoField).__optional);
    const cleaned: OpenApiSchema = { ...schema };
    delete (cleaned as { __optional?: boolean }).__optional;
    resolved[key] = cleaned;
    if (!isOptional) required.push(key);
  }

  return brand({
    type: 'object',
    description: options.description,
    properties: resolved,
    required: options.required ?? (required.length ? required : undefined),
    additionalProperties: options.additionalProperties ?? false,
  });
}

/** Alias of {@link dto} for readability in response definitions. */
export const schema = dto;
