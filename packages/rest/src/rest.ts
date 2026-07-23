import type { Router, Route } from '@adonisjs/core/http';
import type { RouteOpenApiMeta } from './route-meta.js';
import { installRestRouteMacros } from './macros.js';

export interface RestRouteBuilder {
  openapi(meta: RouteOpenApiMeta): Route;
  as(name: string, prepend?: boolean): RestRouteBuilder;
  use(...args: Parameters<Route['use']>): RestRouteBuilder;
  middleware(...args: Parameters<Route['middleware']>): RestRouteBuilder;
  where(...args: Parameters<Route['where']>): RestRouteBuilder;
  route: Route;
}

/**
 * Thin helper so you can register routes and attach OpenAPI metadata in one place.
 * Prefer the Adonis macro: `router.get(...).openapi({ ... })`.
 *
 * @example
 * rest(router)
 *   .get('/api/users', [UsersController, 'index'])
 *   .openapi({ query: listValidator, response: UserListDto, tags: ['Users'] })
 */
export function rest(router: Router) {
  installRestRouteMacros();
  return new RestRouter(router);
}

class RestRouter {
  constructor(private readonly router: Router) {}

  get(pattern: string, handler: Parameters<Router['get']>[1]): RestRouteBuilder {
    return this.wrap(this.router.get(pattern, handler));
  }

  post(pattern: string, handler: Parameters<Router['post']>[1]): RestRouteBuilder {
    return this.wrap(this.router.post(pattern, handler));
  }

  put(pattern: string, handler: Parameters<Router['put']>[1]): RestRouteBuilder {
    return this.wrap(this.router.put(pattern, handler));
  }

  patch(pattern: string, handler: Parameters<Router['patch']>[1]): RestRouteBuilder {
    return this.wrap(this.router.patch(pattern, handler));
  }

  delete(pattern: string, handler: Parameters<Router['delete']>[1]): RestRouteBuilder {
    return this.wrap(this.router.delete(pattern, handler));
  }

  private wrap(route: Route): RestRouteBuilder {
    const builder: RestRouteBuilder = {
      openapi: (meta: RouteOpenApiMeta) => {
        route.openapi(meta);
        return route;
      },
      as: (name: string, prepend?: boolean) => {
        route.as(name, prepend);
        return builder;
      },
      use: (...args) => {
        route.use(...args);
        return builder;
      },
      middleware: (...args) => {
        route.middleware(...args);
        return builder;
      },
      where: (...args) => {
        route.where(...args);
        return builder;
      },
      route,
    };
    return builder;
  }
}
