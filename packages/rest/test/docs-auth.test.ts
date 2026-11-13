import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ResourceRegistry } from '@shamar/core';
import {
  defineRestConfig,
  docsRequireAuth,
  registerRestRoutes,
  type RestDocsAuthMiddleware,
} from '../src/index.js';

type MockRoute = {
  path: string;
  handler: unknown;
  name?: string;
  middleware: RestDocsAuthMiddleware[];
  as: (name: string) => MockRoute;
  use: (mw: RestDocsAuthMiddleware) => MockRoute;
};

function createMockRouter() {
  const routes: MockRoute[] = [];
  const router = {
    get(path: string, handler: unknown) {
      const route: MockRoute = {
        path,
        handler,
        middleware: [],
        as(name: string) {
          route.name = name;
          return route;
        },
        use(mw: RestDocsAuthMiddleware) {
          route.middleware.push(mw);
          return route;
        },
      };
      routes.push(route);
      return route;
    },
  };
  return { router, routes };
}

describe('@shamar/rest docs.requireAuth config', () => {
  it('defaults requireAuth to false (public docs)', () => {
    const config = defineRestConfig({});
    assert.equal(config.docs?.requireAuth, false);
    assert.equal(docsRequireAuth(config), false);
    assert.equal(docsRequireAuth(undefined), false);
    assert.equal(docsRequireAuth({}), false);
  });

  it('preserves requireAuth: true', () => {
    const config = defineRestConfig({ docs: { requireAuth: true } });
    assert.equal(config.docs?.requireAuth, true);
    assert.equal(docsRequireAuth(config), true);
    assert.equal(docsRequireAuth({ docs: { requireAuth: true } }), true);
  });
});

describe('@shamar/rest docs route auth', () => {
  it('registers public docs and OpenAPI without middleware by default', () => {
    const { router, routes } = createMockRouter();
    const registry = new ResourceRegistry([]);
    const authMiddleware: RestDocsAuthMiddleware = async (_ctx, next) => next();

    registerRestRoutes(router as never, {
      apiPrefix: '/api/shamar',
      registry,
      router: router as never,
      config: {},
      authMiddleware,
    });

    assert.equal(routes.length, 2);
    const openapi = routes.find((r) => r.name === 'shamar.rest.openapi');
    const docs = routes.find((r) => r.name === 'shamar.rest.docs');
    assert.ok(openapi);
    assert.ok(docs);
    assert.equal(openapi.path, '/api/shamar/openapi.json');
    assert.equal(docs.path, '/api/shamar/docs');
    assert.deepEqual(openapi.middleware, []);
    assert.deepEqual(docs.middleware, []);
  });

  it('applies authMiddleware to OpenAPI and docs when requireAuth is true', () => {
    const { router, routes } = createMockRouter();
    const registry = new ResourceRegistry([]);
    const authMiddleware: RestDocsAuthMiddleware = async (_ctx, next) => next();

    registerRestRoutes(router as never, {
      apiPrefix: '/api/shamar',
      registry,
      router: router as never,
      config: { docs: { requireAuth: true } },
      authMiddleware,
    });

    assert.equal(routes.length, 2);
    const openapi = routes.find((r) => r.name === 'shamar.rest.openapi');
    const docs = routes.find((r) => r.name === 'shamar.rest.docs');
    assert.ok(openapi);
    assert.ok(docs);
    assert.deepEqual(openapi.middleware, [authMiddleware]);
    assert.deepEqual(docs.middleware, [authMiddleware]);
  });

  it('throws when requireAuth is true but authMiddleware is missing', () => {
    const { router } = createMockRouter();
    const registry = new ResourceRegistry([]);

    assert.throws(
      () =>
        registerRestRoutes(router as never, {
          apiPrefix: '/api/shamar',
          registry,
          router: router as never,
          config: { docs: { requireAuth: true } },
        }),
      /docs\.requireAuth is true but no authMiddleware/,
    );
  });

  it('does not register docs UI when docs.enabled is false, but still protects OpenAPI', () => {
    const { router, routes } = createMockRouter();
    const registry = new ResourceRegistry([]);
    const authMiddleware: RestDocsAuthMiddleware = async (_ctx, next) => next();

    registerRestRoutes(router as never, {
      apiPrefix: '/api/shamar',
      registry,
      router: router as never,
      config: { docs: { enabled: false, requireAuth: true } },
      authMiddleware,
    });

    assert.equal(routes.length, 1);
    assert.equal(routes[0]?.name, 'shamar.rest.openapi');
    assert.deepEqual(routes[0]?.middleware, [authMiddleware]);
  });
});
