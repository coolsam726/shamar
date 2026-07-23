import type { ResourceMeta } from '@shamar/core';
import type { Router } from '@adonisjs/core/http';
import type { BuildOpenApiOptions, OpenApiDocument, OpenApiSchema } from '../types.js';
import {
  buildPathsFromDiscoveredRoutes,
  discoverRouterRoutes,
  type DiscoverRoutesOptions,
} from '../discover.js';
import { resourcePaths } from './paths.js';
import {
  paginatedSchema,
  resourceReadSchema,
  resourceWriteSchema,
  schemaName,
} from './schemas.js';

function normalizePrefix(prefix?: string): string {
  if (!prefix) return '/api/shamar';
  const trimmed = prefix.replace(/\/+$/, '');
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function collectResources(options: BuildOpenApiOptions): ResourceMeta[] {
  if (options.resources?.length) return options.resources;
  if (options.registry) return options.registry.all();
  return [];
}

export interface BuildOpenApiDocumentOptions extends BuildOpenApiOptions {
  /** Adonis router — when set, custom `/api/*` routes are discovered. */
  router?: Router;
  /** Route discovery options (prefixes, excludes). */
  discover?: DiscoverRoutesOptions | false;
}

/**
 * Build an OpenAPI 3.1 document for Shamar resource CRUD + discovered app routes.
 *
 * Paths are absolute from the site root (server url `/`) so Shamar CRUD
 * (`/api/shamar/...`) and custom routes (`/api/users`) share one docs UI.
 */
export function buildOpenApiDocument(options: BuildOpenApiDocumentOptions = {}): OpenApiDocument {
  const apiPrefix = normalizePrefix(options.apiPrefix);
  const resources = collectResources(options);
  const title = options.title ?? 'Shamar API';
  const version = options.version ?? '1.0.0';
  const securityEnabled = options.security !== false;

  const schemas: Record<string, OpenApiSchema> = {};
  const paths: OpenApiDocument['paths'] = {};
  const tags = resources.map((meta) => ({
    name: meta.label,
    description: `${meta.singularLabel} resource (\`${meta.slug}\`)`,
  }));
  const resourcePathKeys = new Set<string>();

  for (const meta of resources) {
    const readName = schemaName(meta.slug, 'Record');
    const createName = schemaName(meta.slug, 'Create');
    const updateName = schemaName(meta.slug, 'Update');
    const listName = schemaName(meta.slug, 'List');

    schemas[readName] = resourceReadSchema(meta);
    schemas[createName] = resourceWriteSchema(meta, 'create');
    schemas[updateName] = resourceWriteSchema(meta, 'update');
    schemas[listName] = paginatedSchema(`#/components/schemas/${readName}`);

    const resourcePathMap = resourcePaths(meta, apiPrefix);
    for (const key of Object.keys(resourcePathMap)) resourcePathKeys.add(key);
    Object.assign(paths, resourcePathMap);
  }

  if (options.router && options.discover !== false) {
    const discovered = discoverRouterRoutes(options.router, {
      prefixes: options.discover?.prefixes ?? ['/api'],
      exclude: options.discover?.exclude,
    });
    const discoveredPaths = buildPathsFromDiscoveredRoutes(discovered, {
      skipPatterns: resourcePathKeys,
    });
    for (const [path, item] of Object.entries(discoveredPaths)) {
      const existing = paths[path];
      paths[path] = existing ? { ...existing, ...item } : item;
    }

    for (const route of discovered) {
      for (const tag of route.meta?.tags ?? []) {
        if (!tags.some((entry) => entry.name === tag)) {
          tags.push({ name: tag, description: tag });
        }
      }
    }
  }

  const document: OpenApiDocument = {
    openapi: '3.1.0',
    info: {
      title,
      version,
      description:
        options.description ??
        'JSON API for Shamar resources and app routes. Authenticate with `X-Api-Key` when API protection is enabled.',
    },
    servers: options.servers ?? [{ url: '/', description: 'Application origin' }],
    tags,
    paths,
    components: {
      schemas,
    },
  };

  if (securityEnabled) {
    document.components!.securitySchemes = {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Api-Key',
        description: 'Machine API key (gateway)',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'PAT',
        description: 'Optional user personal access token',
      },
    };
    document.security = [{ ApiKeyAuth: [] }, { BearerAuth: [] }];
  }

  return document;
}
