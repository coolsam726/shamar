import type { HttpContext } from '@adonisjs/core/http';
import type { Router } from '@adonisjs/core/http';
import type { ResourceRegistry } from '@shamar/core';
import { resolveRestConfig } from './config.js';
import { renderScalarHtml } from './docs/scalar-html.js';
import { buildOpenApiDocument } from './openapi/document.js';
import type { ShamarRestConfig } from './types.js';

export interface RegisterRestRoutesOptions {
  /** JSON API prefix (same as `@shamar/adonis` `apiPrefix`). */
  apiPrefix: string;
  /** Primary panel registry (API resources). */
  registry: ResourceRegistry;
  /** Adonis router — used to discover custom `/api` routes. */
  router: Router;
  config?: ShamarRestConfig | null;
}

function joinApiPath(apiPrefix: string, suffix: string): string {
  const base = apiPrefix.replace(/\/+$/, '') || '';
  const path = suffix.startsWith('/') ? suffix : `/${suffix}`;
  return `${base}${path}` || '/';
}

/**
 * Register OpenAPI JSON + docs UI under the API prefix.
 * These routes are intentionally outside API-key middleware.
 */
export function registerRestRoutes(router: Router, options: RegisterRestRoutesOptions): void {
  const config = resolveRestConfig(options.config);
  if (config.enabled === false) return;

  const apiPrefix = options.apiPrefix.replace(/\/+$/, '') || '/api/shamar';
  const openapiPath = config.openapiPath ?? '/openapi.json';
  const docsEnabled = config.docs?.enabled !== false;
  const docsPath = config.docs?.path ?? '/docs';
  const title = config.openapi?.title ?? 'Shamar API';

  const openApiAbsolute = joinApiPath(apiPrefix, openapiPath);
  const docsAbsolute = joinApiPath(apiPrefix, docsPath);

  router
    .get(openApiAbsolute, async ({ response }: HttpContext) => {
      const document = buildOpenApiDocument({
        apiPrefix,
        registry: options.registry,
        router: options.router,
        discover: config.discover,
        title: config.openapi?.title,
        version: config.openapi?.version,
        description: config.openapi?.description,
        servers: config.openapi?.servers,
        security: config.security,
      });
      response.header('Content-Type', 'application/json; charset=utf-8');
      return response.send(document);
    })
    .as('shamar.rest.openapi');

  if (docsEnabled) {
    router
      .get(docsAbsolute, async ({ response }: HttpContext) => {
        const html = renderScalarHtml({
          openApiUrl: openApiAbsolute,
          title: `${title} Docs`,
        });
        response.header('Content-Type', 'text/html; charset=utf-8');
        return response.send(html);
      })
      .as('shamar.rest.docs');
  }
}
