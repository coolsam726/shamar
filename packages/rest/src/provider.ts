import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import type { ApplicationService } from '@adonisjs/core/types';
import { resolveRestConfig } from './config.js';
import { installRestRouteMacros } from './macros.js';
import { registerRestRoutes, type RestDocsAuthMiddleware } from './routes.js';
import type { ShamarRestConfig } from './types.js';

/**
 * Minimal runtime shape expected from `@shamar/adonis` (`shamar.runtime`).
 */
interface ShamarRuntimeLike {
  config: {
    apiPrefix?: string;
    rest?: ShamarRestConfig;
    auth?: {
      guard?: string;
      resolveUser?: (...args: unknown[]) => unknown;
      apiKeys?: {
        resolve?: (...args: unknown[]) => unknown;
        protectApi?: boolean;
      };
    };
  };
  registry: import('@shamar/core').ResourceRegistry;
}

/**
 * Adonis provider — register after `@shamar/adonis/provider`.
 *
 * Serves:
 * - `GET {apiPrefix}/openapi.json`
 * - `GET {apiPrefix}/docs` (Scalar)
 *
 * When `rest.docs.requireAuth` is true, both routes accept panel session
 * (same guard as the admin) **or** machine API key (`X-Api-Key`).
 *
 * Also installs `Route.openapi()` so custom routes can attach Vine/DTO metadata.
 */
export default class ShamarRestProvider {
  constructor(protected app: ApplicationService) {}

  register(): void {
    // Macros are installed in boot() against the app's Route class.
  }

  async boot(): Promise<void> {
    await this.installAppRouteMacros();

    const router = await this.app.container.make('router');
    let runtime: ShamarRuntimeLike;
    try {
      runtime = (await this.app.container.make('shamar.runtime')) as ShamarRuntimeLike;
    } catch (error) {
      throw new Error(
        '@shamar/rest requires @shamar/adonis (shamar.runtime). Register @shamar/adonis/provider first.',
        { cause: error },
      );
    }

    const fileConfig = this.app.config.get('shamar_rest') as ShamarRestConfig | undefined;
    const config = resolveRestConfig(fileConfig ?? runtime.config.rest);
    const apiPrefix = runtime.config.apiPrefix ?? '/api/shamar';

    let authMiddleware: RestDocsAuthMiddleware | undefined;
    if (config.docs?.requireAuth) {
      authMiddleware = await this.resolveDocsAuthMiddleware(runtime);
    }

    registerRestRoutes(router, {
      apiPrefix,
      registry: runtime.registry,
      router,
      config,
      authMiddleware,
    });
  }

  /**
   * Resolve dual docs auth from `@shamar/adonis`: panel session OR machine key.
   */
  private async resolveDocsAuthMiddleware(
    runtime: ShamarRuntimeLike,
  ): Promise<RestDocsAuthMiddleware> {
    let createRequireDocsAuthMiddleware: (config: unknown) => RestDocsAuthMiddleware;
    try {
      // Dynamic path avoids a compile-time dependency on `@shamar/adonis`
      // (already required at runtime for `shamar.runtime`).
      const middlewareId = '@shamar/adonis/docs_auth_middleware';
      const mod = (await import(middlewareId)) as {
        createRequireDocsAuthMiddleware: (config: unknown) => RestDocsAuthMiddleware;
      };
      createRequireDocsAuthMiddleware = mod.createRequireDocsAuthMiddleware;
    } catch (error) {
      throw new Error(
        '@shamar/rest: docs.requireAuth needs @shamar/adonis (RequireDocsAuthMiddleware).',
        { cause: error },
      );
    }

    let shamarConfig: unknown = runtime.config;
    try {
      shamarConfig = await this.app.container.make('shamar.config');
    } catch {
      // Fall back to runtime.config (same object in normal setups).
    }

    const hasSessionAuth = Boolean(runtime.config.auth?.guard || runtime.config.auth?.resolveUser);
    const hasApiKeyAuth = Boolean(runtime.config.auth?.apiKeys?.resolve);
    if (!hasSessionAuth && !hasApiKeyAuth) {
      throw new Error(
        '@shamar/rest: docs.requireAuth is true but neither panel session auth ' +
          '(auth.guard / auth.resolveUser) nor auth.apiKeys.resolve is configured. ' +
          'Configure at least one, or set docs.requireAuth to false.',
      );
    }

    return createRequireDocsAuthMiddleware(shamarConfig);
  }

  /**
   * Resolve `@adonisjs/core/http` from the application root so we patch the
   * same `Route` class the playground router uses (not a nested copy under
   * `packages/rest/node_modules`).
   */
  private async installAppRouteMacros(): Promise<void> {
    const require = createRequire(this.app.makePath('./package.json'));
    const resolved = require.resolve('@adonisjs/core/http');
    const http = await import(pathToFileURL(resolved).href);
    if (!http.Route) {
      throw new Error('@shamar/rest: could not load Route from application @adonisjs/core/http');
    }
    installRestRouteMacros(http.Route);
  }
}
