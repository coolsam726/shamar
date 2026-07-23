import type { Route as RouteType } from '@adonisjs/core/http';
import { Route } from '@adonisjs/core/http';
import {
  setRouteOpenApiMeta,
  stashRouteOpenApi,
  takeStashedRouteOpenApi,
  type RouteOpenApiMeta,
} from './route-meta.js';

declare module '@adonisjs/core/http' {
  interface Route {
    /**
     * Attach OpenAPI metadata for `@shamar/rest` docs generation.
     * Use Vine validators for body/query and DTO helpers for responses.
     */
    openapi(meta: RouteOpenApiMeta): this;
  }
}

type RouteConstructor = {
  macro: (name: string, handler: (this: RouteType, meta: RouteOpenApiMeta) => RouteType) => void;
  prototype: {
    toJSON: () => { meta?: Record<string, unknown> };
    __shamarOpenApiPatched?: boolean;
  };
};

const installed = new WeakSet<object>();

/**
 * Install `Route.openapi()` on the given Route class (defaults to this
 * package's `@adonisjs/core` resolution).
 *
 * Prefer passing the **application's** Route from the provider so the macro
 * lands on the same class instance `router.get()` returns (pnpm may nest a
 * second `@adonisjs/core` under `packages/rest/node_modules`).
 */
export function installRestRouteMacros(RouteClass: RouteConstructor = Route as RouteConstructor): void {
  if (installed.has(RouteClass)) return;
  installed.add(RouteClass);

  RouteClass.macro('openapi', function openapi(this: RouteType, meta: RouteOpenApiMeta) {
    stashRouteOpenApi(this, meta);
    return this;
  });

  const proto = RouteClass.prototype;
  if (proto.__shamarOpenApiPatched) return;
  proto.__shamarOpenApiPatched = true;

  const originalToJSON = proto.toJSON;
  proto.toJSON = function patchedToJSON(this: RouteType) {
    const json = originalToJSON.call(this);
    const meta = takeStashedRouteOpenApi(this);
    if (meta) {
      setRouteOpenApiMeta(json, meta);
    }
    return json;
  };
}
