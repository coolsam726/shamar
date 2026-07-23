import type { OpenApiSchema } from '../types.js';

/**
 * Convert a Vine schema / validator (`toJSONSchema()`) into an OpenAPI schema object.
 * Vine already emits JSON Schema Draft-07; we normalize a few OpenAPI differences.
 */
export function vineToOpenApiSchema(input: {
  toJSONSchema: () => Record<string, unknown>;
}): OpenApiSchema {
  return normalizeJsonSchema(input.toJSONSchema()) as OpenApiSchema;
}

function normalizeJsonSchema(node: unknown): Record<string, unknown> {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return { type: 'object', additionalProperties: true };
  }

  const source = node as Record<string, unknown>;
  const out: Record<string, unknown> = { ...source };

  // JSON Schema nullable often uses type: ["string", "null"] — keep as-is for OAS 3.1.
  if (out.properties && typeof out.properties === 'object' && !Array.isArray(out.properties)) {
    const props: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(out.properties as Record<string, unknown>)) {
      props[key] = normalizeJsonSchema(value);
    }
    out.properties = props;
  }

  if (out.items) {
    out.items = normalizeJsonSchema(out.items);
  }

  if (out.additionalProperties && typeof out.additionalProperties === 'object') {
    out.additionalProperties = normalizeJsonSchema(out.additionalProperties);
  }

  if (Array.isArray(out.anyOf)) {
    out.anyOf = out.anyOf.map((entry) => normalizeJsonSchema(entry));
  }
  if (Array.isArray(out.oneOf)) {
    out.oneOf = out.oneOf.map((entry) => normalizeJsonSchema(entry));
  }
  if (Array.isArray(out.allOf)) {
    out.allOf = out.allOf.map((entry) => normalizeJsonSchema(entry));
  }

  return out;
}
