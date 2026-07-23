import type { ResourceMeta, ResourceRegistry } from '@shamar/core';
import { resolveContentMaxWidth } from '@shamar/core';
import type { AuthorizationContext } from '@shamar/cherubim';
import type { Authorizer } from '@shamar/cherubim';
import type { ShamarConfig } from '../config.js';
import { canViewResource } from './auth.js';
import { resolveBranding, type ShamarBranding } from './branding.js';
import { menuLayoutContext, type NavigationGroup, type RecordBreadcrumbOptions } from './menu.js';
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
  logoutPath?: string;
  showCreateButton?: boolean;
  showEditButton?: boolean;
  showDeleteButton?: boolean;
  showBackToList?: boolean;
  flash?: { type: string; message: string };
  flashJson?: string;
  /** Tailwind class for form/show content width (e.g. `max-w-5xl`). */
  contentMaxWidthClass: string;
  /** Optional inline max-width when a CSS length was configured. */
  contentMaxWidthStyle?: string;
}

export function navigationGroups(
  registry: ResourceRegistry,
  options?: {
    authorizer?: Authorizer;
    authCtx?: AuthorizationContext;
  },
): NavigationGroup[] {
  const canView = (slug: string) => {
    if (!options?.authorizer || !options.authCtx) return true;
    return canViewResource(options.authorizer, options.authCtx, registry, slug);
  };

  return registry
    .navigationGroups()
    .map((group) => ({
      name: group.name,
      items: group.items.filter((item) => canView(item.slug)),
    }))
    .filter((group) => group.items.length > 0);
}

export function buildShellContext(options: {
  config: ShamarConfig;
  registry: ResourceRegistry;
  meta?: ResourceMeta;
  pageTitle: string;
  basePath?: string;
  branding?: ShamarConfig['branding'];
  /** Panel-level default; resource `contentMaxWidth` wins when set on meta. */
  panelContentMaxWidth?: string;
  authorizer?: Authorizer;
  authCtx?: AuthorizationContext;
  showCreateButton?: boolean;
  showEditButton?: boolean;
  showDeleteButton?: boolean;
  showBackToList?: boolean;
  flash?: { type: string; message: string };
  recordBreadcrumb?: RecordBreadcrumbOptions;
}): AdminShellContext {
  const basePath = options.basePath ?? options.config.path ?? '/admin';
  const groups = navigationGroups(options.registry, {
    authorizer: options.authorizer,
    authCtx: options.authCtx,
  });
  const menu = menuLayoutContext(
    groups,
    basePath,
    options.meta?.slug,
    options.pageTitle,
    options.recordBreadcrumb,
  );
  const brandingInput = options.branding ?? options.config.branding;
  const branding = resolveBranding(brandingInput);
  const authUser = options.authCtx?.user;
  const userName = authUser?.name ?? brandingInput?.name ?? branding.brandName;
  const flash = options.flash;
  const flashJson = flash ? JSON.stringify(flash).replace(/</g, '\\u003c') : undefined;
  const contentMaxWidth = resolveContentMaxWidth(
    options.meta?.contentMaxWidth ?? options.panelContentMaxWidth,
  );

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
    user: {
      name: userName,
      email: authUser?.email,
    },
    userInitial: userName.slice(0, 2).toUpperCase(),
    logoutPath: options.config.auth?.logoutPath,
    showCreateButton: options.showCreateButton,
    showEditButton: options.showEditButton,
    showDeleteButton: options.showDeleteButton,
    showBackToList: options.showBackToList,
    flash,
    flashJson,
    contentMaxWidthClass: contentMaxWidth.className,
    contentMaxWidthStyle: contentMaxWidth.style,
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
