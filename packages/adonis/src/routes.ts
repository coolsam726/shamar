import type { HttpContext } from '@adonisjs/core/http';
import type { Router } from '@adonisjs/core/http';
import type { ApplicationService } from '@adonisjs/core/types';
import type { ShamarRuntime, PanelRuntime } from './runtime.js';
import { AdminController } from './controllers/admin_controller.js';
import { AssetsController } from './assets-controller.js';
import type { ShamarHttpContext } from './context.js';

type AdminAction = keyof {
  [Key in keyof AdminController as AdminController[Key] extends (
    ctx: ShamarHttpContext,
  ) => unknown
    ? Key
    : never]: AdminController[Key];
};

type AssetAction = keyof {
  [Key in keyof AssetsController as AssetsController[Key] extends (
    ctx: HttpContext,
  ) => unknown
    ? Key
    : never]: AssetsController[Key];
};

export async function registerShamarRoutes(
  app: ApplicationService,
  router: Router,
  runtime: ShamarRuntime,
): Promise<void> {
  const apiPrefix = runtime.config.apiPrefix ?? '/api/shamar';

  for (const panel of runtime.panels) {
    registerPanelRoutes(app, router, runtime, panel);
  }

  // JSON API uses the first panel's registry/adapter (compat).
  const primary = runtime.panels[0]!;
  const apiHandler = (action: AdminAction) => {
    return async (ctx: HttpContext) => {
      const controller = new AdminController(primary, runtime.config);
      const method = controller[action] as (
        context: ShamarHttpContext,
        options?: { asJson?: boolean },
      ) => Promise<unknown>;
      return method.call(controller, ctx as ShamarHttpContext, { asJson: true });
    };
  };

  const api = router.group(() => {
    router.get('/:slug', apiHandler('index')).as('shamar.api.index');
    router.get('/:slug/:id', apiHandler('show')).as('shamar.api.show');
    router.post('/:slug', apiHandler('store')).as('shamar.api.store');
    router.put('/:slug/:id', apiHandler('update')).as('shamar.api.update');
    router.delete('/:slug/:id', apiHandler('destroy')).as('shamar.api.destroy');
  });

  api.prefix(apiPrefix);
}

function registerPanelRoutes(
  app: ApplicationService,
  router: Router,
  runtime: ShamarRuntime,
  panel: PanelRuntime,
): void {
  const prefix = panel.path.replace(/\/+$/, '') || '/admin';
  const routePrefix = `shamar.${panel.id}`;

  const handler = (action: AdminAction, asJson = false) => {
    return async (ctx: HttpContext) => {
      const controller = new AdminController(panel, runtime.config);
      const method = controller[action] as (
        context: ShamarHttpContext,
        options?: { asJson?: boolean },
      ) => Promise<unknown>;
      return method.call(controller, ctx as ShamarHttpContext, { asJson });
    };
  };

  const assets = new AssetsController(runtime.config, panel.config.branding);

  const assetHandler = (action: AssetAction) => {
    return async (ctx: HttpContext) => {
      const method = assets[action] as (context: HttpContext) => unknown;
      return method.call(assets, ctx);
    };
  };

  const group = router.group(() => {
    router.get('/assets/admin.css', assetHandler('adminCss')).as(`${routePrefix}.assets.adminCss`);
    router
      .get('/assets/branding.css', assetHandler('brandingCss'))
      .as(`${routePrefix}.assets.brandingCss`);
    router.get('/assets/shamar-ui.js', assetHandler('shamarUi')).as(`${routePrefix}.assets.shamarUi`);
    router.get('/assets/loom-ui.js', assetHandler('shamarUi')).as(`${routePrefix}.assets.legacyUi`);
    router
      .get('/assets/alpine.min.js', assetHandler('alpineJs'))
      .as(`${routePrefix}.assets.alpineJs`);

    router.get('/', handler('dashboard')).as(`${routePrefix}.dashboard`);
    router.get('/:slug/create', handler('create')).as(`${routePrefix}.resources.create`);
    router.post('/:slug/form-state', handler('formState')).as(`${routePrefix}.resources.formState`);
    router.post('/:slug', handler('store')).as(`${routePrefix}.resources.store`);
    router.get('/:slug/:id/edit', handler('edit')).as(`${routePrefix}.resources.edit`);
    router.post('/:slug/:id/delete', handler('destroy')).as(`${routePrefix}.resources.destroy`);
    router.post('/:slug/:id', handler('update')).as(`${routePrefix}.resources.update`);
    router.put('/:slug/:id', handler('update')).as(`${routePrefix}.resources.update.put`);
    router.delete('/:slug/:id', handler('destroy')).as(`${routePrefix}.resources.destroy.delete`);
    router
      .get('/:slug/:id', handler('show'))
      .where('slug', /^(?!assets$)/)
      .as(`${routePrefix}.resources.show`);
    router
      .get('/:slug', handler('index'))
      .where('slug', /^(?!assets$)/)
      .as(`${routePrefix}.resources.index`);
  });

  group.prefix(prefix);
  void app;
}
