import type { Router } from '@adonisjs/core/http';
import type {
  OpenApiOperation,
  OpenApiParameter,
  OpenApiPathItem,
  OpenApiSchema,
} from './types.js';
import { getRouteOpenApiMeta, type RouteOpenApiMeta, type RouteResponseDef } from './route-meta.js';
import { resolveSchema, type SchemaInput } from './schema/resolve.js';

export interface DiscoveredRoute {
  pattern: string;
  methods: string[];
  name?: string;
  meta?: RouteOpenApiMeta;
}

export interface DiscoverRoutesOptions {
  /** Path prefixes to include (default `['/api']`). */
  prefixes?: string[];
  /** Exact paths or prefixes to exclude. */
  exclude?: string[];
}

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);

/**
 * Read committed Adonis routes and keep those under configured API prefixes.
 */
export function discoverRouterRoutes(
  router: Router,
  options: DiscoverRoutesOptions = {},
): DiscoveredRoute[] {
  const prefixes = (options.prefixes ?? ['/api']).map(normalizePrefix);
  const exclude = (options.exclude ?? []).map(normalizePath);

  const json = router.toJSON() as Record<string, Array<Record<string, unknown>>>;
  const found: DiscoveredRoute[] = [];

  for (const routes of Object.values(json)) {
    for (const route of routes ?? []) {
      const pattern = normalizePath(String(route.pattern ?? ''));
      if (!pattern) continue;
      if (!prefixes.some((prefix) => pattern === prefix || pattern.startsWith(`${prefix}/`))) {
        continue;
      }
      if (exclude.some((entry) => pattern === entry || pattern.startsWith(`${entry}/`))) {
        continue;
      }

      // Skip docs endpoints themselves
      if (pattern.endsWith('/docs') || pattern.endsWith('/openapi.json')) continue;

      const methods = (Array.isArray(route.methods) ? route.methods : [])
        .map((method) => String(method).toLowerCase())
        .filter((method) => HTTP_METHODS.has(method) && method !== 'head');

      if (!methods.length) continue;

      found.push({
        pattern,
        methods,
        name: typeof route.name === 'string' ? route.name : undefined,
        meta: getRouteOpenApiMeta(route as { meta?: Record<string, unknown> }),
      });
    }
  }

  return found;
}

export interface BuildDiscoveredPathsOptions {
  /**
   * When a discovered route matches Shamar CRUD (`{apiPrefix}/:slug`), skip it
   * so the richer resource-generated operation wins.
   */
  skipPatterns?: Set<string>;
}

/**
 * Convert discovered Adonis routes into OpenAPI path items.
 */
export function buildPathsFromDiscoveredRoutes(
  routes: DiscoveredRoute[],
  options: BuildDiscoveredPathsOptions = {},
): Record<string, OpenApiPathItem> {
  const paths: Record<string, OpenApiPathItem> = {};

  for (const route of routes) {
    const openApiPath = toOpenApiPath(route.pattern);
    if (options.skipPatterns?.has(openApiPath)) continue;

    const item = paths[openApiPath] ?? {};
    for (const method of route.methods) {
      if (!HTTP_METHODS.has(method) || method === 'options' || method === 'head') continue;
      (item as Record<string, OpenApiOperation>)[method] = buildOperation(route, method);
    }
    paths[openApiPath] = item;
  }

  return paths;
}

function buildOperation(route: DiscoveredRoute, method: string): OpenApiOperation {
  const meta = route.meta ?? {};
  const tag = meta.tags?.[0] ?? inferTag(route.pattern);
  const parameters: OpenApiParameter[] = [
    ...pathParameters(route.pattern, meta.params),
    ...queryParameters(meta.query),
  ];

  const operation: OpenApiOperation = {
    operationId: meta.operationId ?? route.name ?? `${method}_${slugify(route.pattern)}`,
    summary: meta.summary ?? humanizeRoute(method, route.pattern),
    description: meta.description,
    tags: meta.tags ?? (tag ? [tag] : undefined),
    parameters: parameters.length ? parameters : undefined,
    responses: buildResponses(meta, method),
    security: meta.security,
  };

  if (meta.body && ['post', 'put', 'patch'].includes(method)) {
    operation.requestBody = {
      required: true,
      content: {
        'application/json': { schema: resolveSchema(meta.body) },
      },
    };
  }

  return operation;
}

function buildResponses(meta: RouteOpenApiMeta, method: string) {
  const responses: OpenApiOperation['responses'] = {};

  if (meta.responses) {
    for (const [status, def] of Object.entries(meta.responses)) {
      responses[String(status)] = toOpenApiResponse(def);
    }
  } else if (meta.response) {
    const status = String(meta.responseStatus ?? (method === 'post' ? 201 : 200));
    responses[status] = toOpenApiResponse(meta.response);
  } else {
    responses[method === 'post' ? '201' : method === 'delete' ? '204' : '200'] = {
      description: method === 'delete' ? 'Deleted' : 'Success',
      content:
        method === 'delete'
          ? undefined
          : {
              'application/json': {
                schema: { type: 'object', additionalProperties: true },
              },
            },
    };
  }

  responses['400'] ??= { description: 'Bad request / validation error' };
  responses['401'] ??= { description: 'Unauthorized' };
  responses['403'] ??= { description: 'Forbidden' };

  return responses;
}

function toOpenApiResponse(def: SchemaInput | RouteResponseDef) {
  if (def && typeof def === 'object' && 'schema' in def) {
    const typed = def as RouteResponseDef;
    return {
      description: typed.description ?? 'Success',
      content: typed.schema
        ? { 'application/json': { schema: resolveSchema(typed.schema) } }
        : undefined,
    };
  }
  return {
    description: 'Success',
    content: {
      'application/json': { schema: resolveSchema(def as SchemaInput) },
    },
  };
}

function pathParameters(pattern: string, paramsSchema?: SchemaInput): OpenApiParameter[] {
  const names = [...pattern.matchAll(/:([A-Za-z_][A-Za-z0-9_]*)/g)].map((match) => match[1]!);
  if (!names.length) return [];

  const properties =
    paramsSchema && typeof paramsSchema === 'object'
      ? (resolveSchema(paramsSchema).properties ?? {})
      : {};

  return names.map((name) => ({
    name,
    in: 'path' as const,
    required: true,
    schema: (properties[name] as OpenApiSchema | undefined) ?? {
      oneOf: [{ type: 'string' }, { type: 'number' }],
    },
  }));
}

function queryParameters(querySchema?: SchemaInput): OpenApiParameter[] {
  if (!querySchema) return [];
  const schema = resolveSchema(querySchema);
  if (schema.type !== 'object' || !schema.properties) {
    return [
      {
        name: 'query',
        in: 'query',
        required: false,
        schema,
        description: 'Query parameters',
      },
    ];
  }

  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties).map(([name, property]) => ({
    name,
    in: 'query' as const,
    required: required.has(name),
    schema: property,
  }));
}

function toOpenApiPath(pattern: string): string {
  return pattern.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, '{$1}');
}

function normalizePrefix(value: string): string {
  const path = normalizePath(value);
  return path === '/' ? '' : path;
}

function normalizePath(value: string): string {
  if (!value) return '';
  const withSlash = value.startsWith('/') ? value : `/${value}`;
  if (withSlash.length > 1 && withSlash.endsWith('/')) return withSlash.slice(0, -1);
  return withSlash;
}

function inferTag(pattern: string): string | undefined {
  const parts = pattern.split('/').filter(Boolean);
  // /api/users → Users ; /api/shamar/posts → Posts
  const candidate = parts[0] === 'api' ? parts[parts[1] === 'shamar' ? 2 : 1] : parts[0];
  if (!candidate || candidate.startsWith(':')) return undefined;
  return candidate.charAt(0).toUpperCase() + candidate.slice(1);
}

function humanizeRoute(method: string, pattern: string): string {
  return `${method.toUpperCase()} ${pattern}`;
}

function slugify(pattern: string): string {
  return pattern
    .replace(/^\//, '')
    .replace(/[/:{}]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export { toOpenApiPath };
