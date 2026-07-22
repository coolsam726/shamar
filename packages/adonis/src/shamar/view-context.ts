import type { ResourceMeta, ResourceRegistry } from '@shamar/core';
import type { ShamarConfig } from '../config.js';
import { resolveBranding, type ShamarBranding } from './branding.js';
import { menuLayoutContext, type NavigationGroup } from './menu.js';
import {
  buildPaginationContext,
  normalizeListQuery,
  type ListViewQuery,
  type PaginationContext,
} from './list-query.js';
import type { PaginatedResult } from '@shamar/core';

export interface AdminShellContext {
  basePath: string;
  panelTitle: string;
  pageTitle: string;
  branding: ShamarBranding;
  navGroups: NavigationGroup[];
  menuRoots: ReturnType<typeof menuLayoutContext>['menuRoots'];
  menuActiveRoot: ReturnType<typeof menuLayoutContext>['menuActiveRoot'];
  menuSecondary: ReturnType<typeof menuLayoutContext>['menuSecondary'];
  breadcrumbs: ReturnType<typeof menuLayoutContext>['breadcrumbs'];
  user: { name: string; email?: string };
  userInitial: string;
  showCreateButton?: boolean;
  showEditButton?: boolean;
  showBackToList?: boolean;
  flash?: { type: string; message: string };
  flashJson?: string;
}

export function navigationGroups(registry: ResourceRegistry): NavigationGroup[] {
  return registry.navigationGroups().map((group) => ({
    name: group.name,
    items: group.items,
  }));
}

export function buildShellContext(options: {
  config: ShamarConfig;
  registry: ResourceRegistry;
  meta?: ResourceMeta;
  pageTitle: string;
  basePath?: string;
  branding?: ShamarConfig['branding'];
  showCreateButton?: boolean;
  showEditButton?: boolean;
  showBackToList?: boolean;
  flash?: { type: string; message: string };
}): AdminShellContext {
  const basePath = options.basePath ?? options.config.path ?? '/admin';
  const groups = navigationGroups(options.registry);
  const menu = menuLayoutContext(
    groups,
    basePath,
    options.meta?.slug,
    options.pageTitle,
  );
  const brandingInput = options.branding ?? options.config.branding;
  const branding = resolveBranding(brandingInput);
  const userName = brandingInput?.name ?? branding.brandName;
  const flash = options.flash;
  const flashJson = flash ? JSON.stringify(flash).replace(/</g, '\\u003c') : undefined;

  return {
    basePath,
    panelTitle: branding.brandName,
    pageTitle: options.pageTitle,
    branding,
    navGroups: groups,
    menuRoots: menu.menuRoots,
    menuActiveRoot: menu.menuActiveRoot,
    menuSecondary: menu.menuSecondary,
    breadcrumbs: menu.breadcrumbs,
    user: { name: userName },
    userInitial: userName.slice(0, 2).toUpperCase(),
    showCreateButton: options.showCreateButton,
    showEditButton: options.showEditButton,
    showBackToList: options.showBackToList,
    flash,
    flashJson,
  };
}

export function buildListContext(options: {
  basePath: string;
  meta: ResourceMeta;
  query: ListViewQuery;
  result: PaginatedResult;
}): { query: ListViewQuery; pagination: PaginationContext; perPageValue: string } {
  const query = normalizeListQuery(options.query);
  const pagination = buildPaginationContext(
    options.basePath,
    options.meta.slug,
    query,
    options.result,
  );
  const perPageValue =
    query.perPage >= 1000 || options.query.perPage === 'all' ? 'all' : String(query.perPage);

  return { query, pagination, perPageValue };
}

export function readFlash(ctx: {
  session: {
    flashMessages?: { has(k: string): boolean; get(k: string): unknown };
  };
}): { type: string; message: string } | undefined {
  const messages = ctx.session.flashMessages;
  if (!messages) return undefined;
  if (messages.has('success')) {
    return { type: 'success', message: String(messages.get('success')) };
  }
  if (messages.has('error')) {
    return { type: 'error', message: String(messages.get('error')) };
  }
  return undefined;
}
