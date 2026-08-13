import {
  PageRegistry,
  ResourceRegistry,
  DashboardPage,
  DASHBOARD_PAGE_SLUG,
  type DashboardPageClass,
  type DataAdapter,
  type MediaLibraryAdapter,
  type PageClass,
  type PanelConfig,
  type Resource,
} from '@shamar/core';
import { createLucidAdapter } from '@shamar/lucid';
import { createMongooseAdapter } from '@shamar/mongoose';
import { defineConfig, type ShamarConfig, type ShamarOrm } from './config.js';
import { createAuthorizer } from './shamar/auth.js';
import { PolicyRegistry, type Authorizer } from '@shamar/cherubim';
import { discoverPages, discoverResources } from './discover.js';
import {
  createLocalMediaStorage,
  type MediaStorage,
} from './shamar/media-storage.js';
import { join } from 'node:path';

export interface PanelMediaRuntime {
  adapter: MediaLibraryAdapter;
  storage: MediaStorage;
  /** Ungated public media URL prefix (default `/media`). */
  publicPath: string;
  label: string;
  /**
   * Nav cluster. Empty/omitted → top-level sidebar root named {@link label}.
   * Default when omitted at config time remains unset (not forced to System).
   */
  navigationGroup?: string;
  navigationSort: number;
  navigationIcon: string;
}

export interface PanelRuntime {
  id: string;
  path: string;
  config: PanelConfig;
  registry: ResourceRegistry;
  pages: PageRegistry;
  adapter: DataAdapter;
  media?: PanelMediaRuntime;
  dashboardPage: DashboardPageClass;
}

export interface ShamarRuntime {
  config: ShamarConfig & { panels: PanelConfig[] };
  authorizer: Authorizer;
  /** @deprecated First panel registry — prefer `panels`. */
  registry: ResourceRegistry;
  /** @deprecated First panel adapter — prefer `panels`. */
  adapter: DataAdapter;
  panels: PanelRuntime[];
  panel(id: string): PanelRuntime;
  panelByPath(pathname: string): PanelRuntime | undefined;
}

export async function createShamarRuntime(
  config: ShamarConfig,
  options: { appRoot?: string } = {},
): Promise<ShamarRuntime> {
  const resolved = defineConfig(config);
  const policyRegistry = new PolicyRegistry();
  if (resolved.auth?.policies) {
    policyRegistry.registerMany(resolved.auth.policies);
  }
  const authorizer = createAuthorizer(resolved, policyRegistry);
  const panels: PanelRuntime[] = [];

  for (const panelConfig of resolved.panels) {
    let resources = [...panelConfig.resources];
    if (panelConfig.discover && options.appRoot) {
      const discovered = await discoverResources(options.appRoot, panelConfig.discover);
      resources = mergeBySlug(resources, discovered, (r) => r.slug);
    }

    let pages = [...(panelConfig.pages ?? [])] as PageClass[];
    if (panelConfig.discoverPages && options.appRoot) {
      const discovered = await discoverPages(options.appRoot, panelConfig.discoverPages);
      pages = mergeBySlug(pages, discovered, (p) => p.slug);
    }

    pages = pages.filter((page) => page.slug !== DASHBOARD_PAGE_SLUG);

    assertNoSlugCollisions(resources, pages, panelConfig.id);

    const dashboardPage = panelConfig.dashboardPage ?? DashboardPage;

    const panelResolved: PanelConfig = {
      ...panelConfig,
      resources,
      pages,
      dashboardPage,
    };
    policyRegistry.registerResources(resources);
    panels.push({
      id: panelResolved.id,
      path: panelResolved.path,
      config: panelResolved,
      registry: new ResourceRegistry(resources),
      pages: new PageRegistry(pages),
      adapter: resolveAdapter(resolved, panelResolved),
      media: resolveMedia(resolved, options.appRoot),
      dashboardPage,
    });
  }

  if (panels.length === 0) {
    throw new Error('Shamar config must define at least one panel');
  }

  const first = panels[0]!;

  return {
    config: resolved,
    authorizer,
    registry: first.registry,
    adapter: first.adapter,
    panels,
    panel(id: string) {
      const found = panels.find((p) => p.id === id);
      if (!found) throw new Error(`Unknown Shamar panel "${id}"`);
      return found;
    },
    panelByPath(pathname: string) {
      const normalized = pathname.replace(/\/+$/, '') || '/';
      return panels
        .slice()
        .sort((a, b) => b.path.length - a.path.length)
        .find((p) => normalized === p.path || normalized.startsWith(`${p.path}/`));
    },
  };
}

function mergeBySlug<T>(
  explicit: T[],
  discovered: T[],
  slugOf: (item: T) => string,
): T[] {
  const bySlug = new Map<string, T>();
  for (const item of [...discovered, ...explicit]) {
    bySlug.set(slugOf(item), item);
  }
  return [...bySlug.values()];
}

function assertNoSlugCollisions(
  resources: Array<typeof Resource>,
  pages: PageClass[],
  panelId: string,
): void {
  const reserved = new Set(['assets', 'profile', 'media', DASHBOARD_PAGE_SLUG]);
  const resourceSlugs = new Set(resources.map((r) => r.slug));
  for (const page of pages) {
    if (reserved.has(page.slug)) {
      throw new Error(`Shamar page slug "${page.slug}" is reserved (panel "${panelId}")`);
    }
    if (resourceSlugs.has(page.slug)) {
      throw new Error(
        `Shamar page slug "${page.slug}" collides with a resource (panel "${panelId}")`,
      );
    }
  }
}

function resolveAdapter(config: ShamarConfig, panel: PanelConfig): DataAdapter {
  if (config.adapter) {
    return typeof config.adapter === 'function' ? config.adapter() : config.adapter;
  }

  const orm: ShamarOrm = panel.orm ?? config.orm ?? 'lucid';
  if (orm === 'mongoose') {
    return createMongooseAdapter();
  }

  return createLucidAdapter();
}

function resolveMedia(
  config: ShamarConfig,
  appRoot?: string,
): PanelMediaRuntime | undefined {
  const media = config.media;
  if (!media?.enabled) return undefined;
  if (!media.adapter) {
    throw new Error(
      'Shamar media library is enabled but `media.adapter` is missing. ' +
        'Pass createMongooseMediaLibraryAdapter(...) or createLucidMediaLibraryAdapter(...).',
    );
  }

  const adapter =
    typeof media.adapter === 'function' ? media.adapter() : media.adapter;
  const disk = media.disk?.trim() || 'shamar';
  const root = media.root
    ? media.root.startsWith('/')
      ? media.root
      : join(appRoot ?? process.cwd(), media.root)
    : join(appRoot ?? process.cwd(), 'storage/media');

  const storage =
    typeof media.storage === 'function'
      ? media.storage()
      : media.storage ?? createLocalMediaStorage({ disk, root });

  return {
    adapter,
    storage,
    publicPath: media.publicPath?.trim() || '/media',
    label: media.label?.trim() || 'Files',
    // Empty / whitespace → top-level root (do not coerce to System).
    navigationGroup: media.navigationGroup?.trim() || undefined,
    navigationSort: media.navigationSort ?? 50,
    navigationIcon: media.navigationIcon?.trim() || 'folder',
  };
}
