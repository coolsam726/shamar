import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import type { ApplicationService } from '@adonisjs/core/types';
import { resolveRestConfig } from './config.js';
import { installRestRouteMacros } from './macros.js';
import { registerRestRoutes } from './routes.js';
import type { ShamarRestConfig } from './types.js';

/**
 * Minimal runtime shape expected from `@shamar/adonis` (`shamar.runtime`).
 */
interface ShamarRuntimeLike {
  config: {
    apiPrefix?: string;
    rest?: ShamarRestConfig;
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

    registerRestRoutes(router, {
      apiPrefix,
      registry: runtime.registry,
      router,
      config,
    });
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
