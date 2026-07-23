import type { ResourceMeta } from '@shamar/core';
import type { OpenApiSchema } from '../types.js';
import { resourceReadSchema } from '../openapi/schemas.js';
import { isDtoSchema, type DtoSchema } from './dto.js';
import { vineToOpenApiSchema } from './vine.js';

/**
 * Anything that can be turned into an OpenAPI schema for docs.
 * - Vine validators / schemas (`toJSONSchema()`)
 * - Response DTOs from `@shamar/rest` helpers
 * - Raw OpenAPI schema objects
 * - Shamar `ResourceMeta` (read shape)
 */
export type SchemaInput =
  | OpenApiSchema
  | DtoSchema
  | ResourceMeta
  | { toJSONSchema: () => Record<string, unknown> }
  | { toJSON: () => { schema?: unknown } };

export function resolveSchema(input: SchemaInput): OpenApiSchema {
  if (!input || typeof input !== 'object') {
    return { type: 'object', additionalProperties: true };
  }

  if (isDtoSchema(input)) {
    return input.toOpenApi();
  }

  if (isResourceMeta(input)) {
    return resourceReadSchema(input);
  }

  if (typeof (input as { toJSONSchema?: unknown }).toJSONSchema === 'function') {
    return vineToOpenApiSchema(input as { toJSONSchema: () => Record<string, unknown> });
  }

  if (typeof (input as { toJSON?: unknown }).toJSON === 'function') {
    const json = (input as { toJSON: () => { schema?: unknown } }).toJSON();
    if (json?.schema && typeof json.schema === 'object') {
      return vineToOpenApiSchema({
        toJSONSchema: () => json.schema as Record<string, unknown>,
      });
    }
  }

  return input as OpenApiSchema;
}

function isResourceMeta(value: object): value is ResourceMeta {
  return (
    'slug' in value &&
    'fields' in value &&
    Array.isArray((value as ResourceMeta).fields) &&
    typeof (value as ResourceMeta).slug === 'string'
  );
}
