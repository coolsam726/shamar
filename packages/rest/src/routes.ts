import type { HttpContext } from '@adonisjs/core/http';
import type { Router } from '@adonisjs/core/http';
import type { ResourceRegistry } from '@shamar/core';
import { resolveRestConfig } from './config.js';
import { renderScalarHtml } from './docs/scalar-html.js';
import { buildOpenApiDocument } from './openapi/document.js';
import type { ShamarRestConfig } from './types.js';

/** Minimal middleware shape accepted by Adonis `Route.use()`. */
export type RestDocsAuthMiddleware = (
  ctx: HttpContext,
  next: () => Promise<unknown>,
) => Promise<unknown> | unknown;

export interface RegisterRestRoutesOptions {
  /** JSON API prefix (same as `@shamar/adonis` `apiPrefix`). */
  apiPrefix: string;
  /** Primary panel registry (API resources). */
  registry: ResourceRegistry;
  /** Adonis router — used to discover custom `/api` routes. */
  router: Router;
  config?: ShamarRestConfig | null;
  /**
   * Middleware applied to OpenAPI + docs routes when `docs.requireAuth` is true.
   * The provider supplies `@shamar/adonis` `RequireDocsAuthMiddleware` by default
   * (panel session OR machine `X-Api-Key`).
   */
  authMiddleware?: RestDocsAuthMiddleware | RestDocsAuthMiddleware[];
}

function joinApiPath(apiPrefix: string, suffix: string): string {
  const base = apiPrefix.replace(/\/+$/, '') || '';
  const path = suffix.startsWith('/') ? suffix : `/${suffix}`;
  return `${base}${path}` || '/';
}

function applyAuthMiddleware(
  route: { use: (...args: unknown[]) => unknown },
  middleware: RestDocsAuthMiddleware | RestDocsAuthMiddleware[],
): void {
  if (Array.isArray(middleware)) {
    for (const mw of middleware) {
      route.use(mw);
    }
    return;
  }
  route.use(middleware);
}

/**
 * Whether docs / OpenAPI routes should require authentication.
 * Public when unset or `false` (backwards compatible).
 */
export function docsRequireAuth(config?: ShamarRestConfig | null): boolean {
  return resolveRestConfig(config).docs?.requireAuth === true;
}

/**
 * Register OpenAPI JSON + docs UI under the API prefix.
 *
 * By default these routes are public (outside API-key middleware).
 * Set `docs.requireAuth: true` and pass `authMiddleware` to protect them.
 */
export function registerRestRoutes(router: Router, options: RegisterRestRoutesOptions): void {
  const config = resolveRestConfig(options.config);
  if (config.enabled === false) return;

  const apiPrefix = options.apiPrefix.replace(/\/+$/, '') || '/api/shamar';
  const openapiPath = config.openapiPath ?? '/openapi.json';
  const docsEnabled = config.docs?.enabled !== false;
  const docsPath = config.docs?.path ?? '/docs';
  const title = config.openapi?.title ?? 'Shamar API';
  const requireAuth = config.docs?.requireAuth === true;

  if (requireAuth && !options.authMiddleware) {
    throw new Error(
      '@shamar/rest: docs.requireAuth is true but no authMiddleware was provided. ' +
        'Use ShamarRestProvider, or pass authMiddleware (e.g. RequireDocsAuthMiddleware).',
    );
  }

  const openApiAbsolute = joinApiPath(apiPrefix, openapiPath);
  const docsAbsolute = joinApiPath(apiPrefix, docsPath);

  const openapiRoute = router
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

  if (requireAuth && options.authMiddleware) {
    applyAuthMiddleware(openapiRoute as { use: (...args: unknown[]) => unknown }, options.authMiddleware);
  }

  if (docsEnabled) {
    const docsRoute = router
      .get(docsAbsolute, async ({ response }: HttpContext) => {
        const html = renderScalarHtml({
          openApiUrl: openApiAbsolute,
          title: `${title} Docs`,
        });
        response.header('Content-Type', 'text/html; charset=utf-8');
        return response.send(html);
      })
      .as('shamar.rest.docs');

    if (requireAuth && options.authMiddleware) {
      applyAuthMiddleware(docsRoute as { use: (...args: unknown[]) => unknown }, options.authMiddleware);
    }
  }
}
