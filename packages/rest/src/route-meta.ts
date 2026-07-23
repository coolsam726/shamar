import type { SchemaInput } from './schema/resolve.js';
import type { OpenApiOperation } from './types.js';

export interface RouteResponseDef {
  description?: string;
  schema?: SchemaInput;
}

/**
 * OpenAPI metadata attached to an Adonis route via `.openapi(...)`.
 * Prefer Vine validators for `body` / `query` and DTO helpers for `response`.
 */
export interface RouteOpenApiMeta {
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
  deprecated?: boolean;
  /** Request body schema (Vine validator, DTO, or raw OpenAPI). */
  body?: SchemaInput;
  /** Query-string schema (Vine object / validator recommended). */
  query?: SchemaInput;
  /** Override path-param schemas (defaults inferred from `:param` segments). */
  params?: SchemaInput;
  /** Shorthand success response (status 200 unless `responseStatus` is set). */
  response?: SchemaInput | RouteResponseDef;
  responseStatus?: number;
  /** Explicit status → response map. */
  responses?: Record<string | number, SchemaInput | RouteResponseDef>;
  security?: OpenApiOperation['security'];
}

const META_KEY = 'shamarOpenApi';

export function getRouteOpenApiMeta(
  route: { meta?: Record<string, unknown> },
): RouteOpenApiMeta | undefined {
  const value = route.meta?.[META_KEY];
  return value && typeof value === 'object' ? (value as RouteOpenApiMeta) : undefined;
}

export function setRouteOpenApiMeta(
  route: { meta?: Record<string, unknown> },
  meta: RouteOpenApiMeta,
): void {
  if (!route.meta || typeof route.meta !== 'object') {
    route.meta = {};
  }
  route.meta![META_KEY] = meta;
}

/** WeakMap used before `toJSON()` so prefixes are applied correctly at commit. */
const pendingByRoute = new WeakMap<object, RouteOpenApiMeta>();

export function stashRouteOpenApi(route: object, meta: RouteOpenApiMeta): void {
  pendingByRoute.set(route, meta);
}

export function takeStashedRouteOpenApi(route: object): RouteOpenApiMeta | undefined {
  return pendingByRoute.get(route);
}
