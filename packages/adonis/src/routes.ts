import type { HttpContext } from '@adonisjs/core/http';
import type { Router } from '@adonisjs/core/http';
import type { ApplicationService } from '@adonisjs/core/types';
import type { ShamarRuntime, PanelRuntime } from './runtime.js';
import { AdminController } from './controllers/admin_controller.js';
import { AssetsController } from './assets-controller.js';
import { MediaController } from './controllers/media_controller.js';
import type { ShamarHttpContext } from './context.js';
import { buildShellContext, readFlash } from './shamar/view-context.js';
import { buildAuthContext, canAccessPanel } from './shamar/auth.js';
import { isMasqueradeSession } from './auth/masquerade.js';
import { isImageLike } from './shamar/media-storage.js';
import { normalizeMediaVisibility, resolveMediaFileUrl } from './shamar/media-url.js';

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

type MediaAction = keyof {
  [Key in keyof MediaController as MediaController[Key] extends (
    ctx: ShamarHttpContext,
  ) => unknown
    ? Key
    : never]: MediaController[Key];
};

const RESERVED_SLUG = /^(?!assets$|profile$|media$)/;

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
      const controller = new AdminController(primary, runtime.config, runtime.authorizer);
      const method = controller[action] as (
        context: ShamarHttpContext,
        options?: { asJson?: boolean },
      ) => Promise<unknown>;
      return method.call(controller, ctx as ShamarHttpContext, { asJson: true });
    };
  };

  const api = router.group(() => {
    // Reserve docs / OpenAPI paths so they are not treated as resource slugs.
    const resourceSlug = {
      match: /^(?!openapi\.json$|docs$).+$/,
    };

    router
      .get('/:slug', apiHandler('index'))
      .where('slug', resourceSlug)
      .as('shamar.api.index');
    router
      .get('/:slug/:id', apiHandler('show'))
      .where('slug', resourceSlug)
      .as('shamar.api.show');
    router
      .post('/:slug', apiHandler('store'))
      .where('slug', resourceSlug)
      .as('shamar.api.store');
    router
      .put('/:slug/:id', apiHandler('update'))
      .where('slug', resourceSlug)
      .as('shamar.api.update');
    router
      .delete('/:slug/:id', apiHandler('destroy'))
      .where('slug', resourceSlug)
      .as('shamar.api.destroy');
  });

  api.prefix(apiPrefix);

  registerPublicMediaRoutes(router, runtime);

  if (runtime.config.auth?.apiKeys?.protectApi) {
    const { createRequireApiKeyMiddleware } = await import(
      './middleware/require_api_key_middleware.js'
    );
    api.use(createRequireApiKeyMiddleware(runtime.config));
  }
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
      const controller = new AdminController(panel, runtime.config, runtime.authorizer);
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
    router
      .get('/assets/vendor/flowbite-datepicker.min.css', assetHandler('flowbiteDatepickerCss'))
      .as(`${routePrefix}.assets.flowbiteDatepickerCss`);
    router
      .get('/assets/vendor/flowbite-datepicker.min.js', assetHandler('flowbiteDatepickerJs'))
      .as(`${routePrefix}.assets.flowbiteDatepickerJs`);
    router
      .get('/assets/vendor/apexcharts.min.js', assetHandler('apexCharts'))
      .as(`${routePrefix}.assets.apexCharts`);
    router
      .get('/assets/vendor/chart.umd.min.js', assetHandler('chartJs'))
      .as(`${routePrefix}.assets.chartJs`);
    router
      .get('/assets/rich-editor/:file', assetHandler('richEditorAsset'))
      .as(`${routePrefix}.assets.richEditor`);

    if (panel.media) {
      registerMediaRoutes(router, runtime, panel, routePrefix);
    }

    router
      .post('/:slug/sections/:section/form-state', handler('sectionFormState'))
      .where('slug', RESERVED_SLUG)
      .as(`${routePrefix}.pages.sectionFormState`);
    router
      .post('/:slug/sections/:section', handler('savePageSection'))
      .where('slug', RESERVED_SLUG)
      .as(`${routePrefix}.pages.sectionSave`);
    router.get('/', handler('dashboard')).as(`${routePrefix}.dashboard`);
    router
      .post('/:slug/action/:action', handler('pageAction'))
      .where('slug', RESERVED_SLUG)
      .as(`${routePrefix}.pages.action`);
    router.get('/:slug/create', handler('create')).as(`${routePrefix}.resources.create`);
    router.post('/:slug/form-state', handler('formState')).as(`${routePrefix}.resources.formState`);
    router
      .get('/:slug/relation-search', handler('relationSearch', true))
      .as(`${routePrefix}.resources.relationSearch`);
    router
      .get('/:slug/relation-table', handler('relationTable', true))
      .as(`${routePrefix}.resources.relationTable`);
    router
      .post('/:slug/relation-quick-create', handler('relationQuickCreate', true))
      .as(`${routePrefix}.resources.relationQuickCreate`);
    router
      .post('/:slug/relation-attach', handler('relationAttach', true))
      .as(`${routePrefix}.resources.relationAttach`);
    router
      .post('/:slug/relation-detach', handler('relationDetach', true))
      .as(`${routePrefix}.resources.relationDetach`);
    router.post('/:slug', handler('store')).as(`${routePrefix}.resources.store`);
    router.post('/:slug/bulk', handler('bulk')).as(`${routePrefix}.resources.bulk`);
    router.get('/:slug/:id/edit', handler('edit')).as(`${routePrefix}.resources.edit`);
    router
      .get('/:slug/:id/summary', handler('summary', true))
      .as(`${routePrefix}.resources.summary`);
    router
      .post('/:slug/:id/action/:action', handler('recordAction'))
      .as(`${routePrefix}.resources.recordAction`);
    router.post('/:slug/:id/delete', handler('destroy')).as(`${routePrefix}.resources.destroy`);
    router.post('/:slug/:id', handler('update')).as(`${routePrefix}.resources.update`);
    router.put('/:slug/:id', handler('update')).as(`${routePrefix}.resources.update.put`);
    router.delete('/:slug/:id', handler('destroy')).as(`${routePrefix}.resources.destroy.delete`);
    router
      .get('/:slug/:id', handler('show'))
      .where('slug', RESERVED_SLUG)
      .as(`${routePrefix}.resources.show`);
    router
      .get('/:slug', handler('index'))
      .where('slug', RESERVED_SLUG)
      .as(`${routePrefix}.resources.index`);
  });

  group.prefix(prefix);
  void app;
}

function registerMediaRoutes(
  router: Router,
  runtime: ShamarRuntime,
  panel: PanelRuntime,
  routePrefix: string,
): void {
  const media = panel.media!;
  const basePath = panel.path.replace(/\/+$/, '') || '/admin';

  const mediaHandler = (action: MediaAction) => {
    return async (ctx: HttpContext) => {
      const shamarCtx = ctx as ShamarHttpContext;
      const authCtx = await buildAuthContext(shamarCtx, runtime.config, panel.id);
      if (authCtx.user && !canAccessPanel(authCtx.user, panel.config)) {
        return ctx.response.unauthorized({ message: 'Forbidden' });
      }
      if (!authCtx.user) {
        return ctx.response.redirect(runtime.config.auth?.loginPath ?? '/login');
      }

      const checkAbility = async (
        _c: ShamarHttpContext,
        ability: 'view' | 'upload' | 'manage',
      ) => {
        const user = authCtx.user;
        if (!user) return false;
        // Super-user / empty-auth hosts: allow when no explicit media abilities.
        const permissions = user.permissions ?? [];
        if (permissions.length === 0) return true;
        const needed =
          ability === 'view'
            ? ['media.view', 'media.upload', 'media.manage', 'media.*']
            : ability === 'upload'
              ? ['media.upload', 'media.manage', 'media.*']
              : ['media.manage', 'media.*'];
        return needed.some((p) => permissions.includes(p) || permissions.includes('*'));
      };

      const controller = new MediaController({
        adapter: media.adapter,
        storage: media.storage,
        basePath,
        publicPath: media.publicPath,
        checkAbility,
      });

      if (action === 'index') {
        const wantsJson =
          ctx.request.qs().format === 'json' ||
          ctx.request.header('accept')?.includes('application/json');
        if (!wantsJson) {
          const shell = await buildShellContext({
            config: runtime.config,
            registry: panel.registry,
            pages: panel.pages,
            currentSlug: 'media',
            pageTitle: media.label,
            basePath,
            branding: panel.config.branding ?? runtime.config.branding,
            panelContentMaxWidth: panel.config.contentMaxWidth,
            authorizer: runtime.authorizer,
            authCtx,
            flash: readFlash(shamarCtx),
            masquerade: isMasqueradeSession(shamarCtx.session) ? { active: true } : undefined,
            mediaNav: {
              label: media.label,
              navigationGroup: media.navigationGroup,
              navigationSort: media.navigationSort,
              navigationIcon: media.navigationIcon,
            },
          });
          const folderId = (ctx.request.qs().folderId as string | undefined) || null;
          const browse = await media.adapter.browse({
            folderId,
            search: (ctx.request.qs().q as string | undefined) || undefined,
            mimePrefix: (ctx.request.qs().mime as string | undefined) || undefined,
          });
          const folderTree = await media.adapter.listFolders();
          return shamarCtx.view.render('shamar::media/manager', {
            ...shell,
            folder: browse.folder,
            mediaBreadcrumbs: browse.breadcrumbs,
            folders: browse.folders,
            folderTree,
            files: browse.files.map((file) => ({
              ...file,
              visibility: normalizeMediaVisibility(file.visibility),
              url: resolveMediaFileUrl(file, {
                panelBasePath: basePath,
                publicPath: media.publicPath,
              }),
              isImage: isImageLike(file),
            })),
            mediaApiBase: `${basePath}/media`,
            publicPath: media.publicPath,
            pageTitle: media.label,
          });
        }
      }

      const method = controller[action] as (context: ShamarHttpContext) => unknown;
      return method.call(controller, shamarCtx);
    };
  };

  router.get('/media', mediaHandler('index')).as(`${routePrefix}.media.index`);
  router.get('/media/browse', mediaHandler('browseJson')).as(`${routePrefix}.media.browse`);
  router.get('/media/folders', mediaHandler('listFolders')).as(`${routePrefix}.media.folders.index`);
  router.post('/media/folders', mediaHandler('createFolder')).as(`${routePrefix}.media.folders.create`);
  router
    .post('/media/folders/:id/rename', mediaHandler('renameFolder'))
    .as(`${routePrefix}.media.folders.rename`);
  router
    .post('/media/folders/:id/move', mediaHandler('moveFolder'))
    .as(`${routePrefix}.media.folders.move`);
  router
    .post('/media/folders/:id/delete', mediaHandler('deleteFolder'))
    .as(`${routePrefix}.media.folders.delete`);
  router.post('/media/upload', mediaHandler('upload')).as(`${routePrefix}.media.upload`);
  router.get('/media/files/:id', mediaHandler('showFile')).as(`${routePrefix}.media.files.show`);
  router.get('/media/files/:id/raw', mediaHandler('rawFile')).as(`${routePrefix}.media.files.raw`);
  router
    .post('/media/files/:id/rename', mediaHandler('renameFile'))
    .as(`${routePrefix}.media.files.rename`);
  router
    .post('/media/files/:id/move', mediaHandler('moveFile'))
    .as(`${routePrefix}.media.files.move`);
  router
    .post('/media/files/:id/visibility', mediaHandler('setFileVisibility'))
    .as(`${routePrefix}.media.files.visibility`);
  router
    .post('/media/files/:id/copy', mediaHandler('copyFile'))
    .as(`${routePrefix}.media.files.copy`);
  router
    .post('/media/files/:id/delete', mediaHandler('deleteFile'))
    .as(`${routePrefix}.media.files.delete`);
}

/** Public (ungated) media bytes — only files marked `visibility: public`. */
function registerPublicMediaRoutes(router: Router, runtime: ShamarRuntime): void {
  const panelWithMedia = runtime.panels.find((panel) => panel.media);
  const media = panelWithMedia?.media;
  if (!media) return;

  const publicPath = media.publicPath.replace(/\/+$/, '') || '/media';
  const basePath = panelWithMedia!.path.replace(/\/+$/, '') || '/admin';
  const controller = new MediaController({
    adapter: media.adapter,
    storage: media.storage,
    basePath,
    publicPath,
  });

  router.get(`${publicPath}/:id`, async (ctx: HttpContext) => {
    return controller.publicRaw(ctx as ShamarHttpContext);
  }).as('shamar.media.public');
}
