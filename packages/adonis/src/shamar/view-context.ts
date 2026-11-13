import type {
  PageMeta,
  PageRegistry,
  ResourceMeta,
  ResourceRegistry,
  ShamarTheme,
  ThemeChromeClasses,
} from '@shamar/core';
import {
  DEFAULT_LIST_PER_PAGE,
  resolveContentMaxWidth,
  resolvePanelTheme,
  resolveThemeChrome,
  resolveThemePartials,
  type ThemePartials,
} from '@shamar/core';
import type { AuthorizationContext } from '@shamar/cherubim';
import type { Authorizer } from '@shamar/cherubim';
import type { ShamarConfig } from '../config.js';
import { panelPathPrefix } from './paths.js';
import { canViewResource } from './auth.js';
import {
  resolveEffectiveBranding,
  type ShamarBranding,
} from './branding.js';
import { resolveThemeHead, type ThemeHeadLinks } from './theme-head.js';
import { mountGlobalSearch } from '../wire/global-search.js';
import { mountNotifications, type PanelNotification } from '../wire/notifications.js';
import {
  menuLayoutContext,
  mergeNavigationGroups,
  type NavItem,
  type NavigationGroup,
  type RecordBreadcrumbOptions,
} from './menu.js';
import {
  buildPaginationContext,
  normalizeListQuery,
  type ListViewQuery,
  type PaginationContext,
} from './list-query.js';
import type { PaginatedResult } from '@shamar/core';

export interface AdminShellContext {
  basePath: string;
  /** Panel id — used for per-panel list preference keys (e.g. perPage cookie). */
  panelId: string;
  panelTitle: string;
  pageTitle: string;
  branding: ShamarBranding;
  navGroups: NavigationGroup[];
  navigationType: ReturnType<typeof menuLayoutContext>['navigationType'];
  sideNavMode: ReturnType<typeof menuLayoutContext>['sideNavMode'];
  sidebarOffcanvas: boolean;
  menuRoots: ReturnType<typeof menuLayoutContext>['menuRoots'];
  menuActiveRoot: ReturnType<typeof menuLayoutContext>['menuActiveRoot'];
  menuSecondary: ReturnType<typeof menuLayoutContext>['menuSecondary'];
  breadcrumbs: ReturnType<typeof menuLayoutContext>['breadcrumbs'];
  user: { name: string; email?: string };
  userInitial: string;
  logoutPath?: string;
  /** Optional account / profile link in the user dropdown. */
  profilePath?: string;
  showCreateButton?: boolean;
  showEditButton?: boolean;
  showDeleteButton?: boolean;
  showBackToList?: boolean;
  flash?: { type: string; message: string };
  flashJson?: string;
  /** Set when the session was created via masquerade password. */
  masquerade?: { active: true };
  /** Tailwind class for form/show content width (e.g. `w-full max-w-screen-xl`). */
  contentMaxWidthClass: string;
  /** Optional inline max-width when a CSS length was configured. */
  contentMaxWidthStyle?: string;
  /** Signed global-search island from `@shamar/wire`. */
  globalSearchHtml: string;
  /** Signed notification bell from `@shamar/wire`. */
  notificationsHtml: string;
  /** Extra user-dropdown links from panel config. */
  userMenuLinks?: Array<{ label: string; href: string; external?: boolean }>;
  /** Firefly-parity theme chrome classes for Edge hooks. */
  themeChrome: ThemeChromeClasses;
  /** Theme head links (stylesheet / google fonts / Tailwind runtime). */
  themeHead: ThemeHeadLinks;
  /**
   * HTML chrome replacements from `theme.partial(slot)` (Firefly parity).
   * Edge: `{{{ themePartials.sidebar }}}` etc. when set.
   */
  themePartials: ThemePartials;
  /** Active panel theme id. */
  themeId: string;
}

export function navigationGroups(
  registry: ResourceRegistry,
  options?: {
    authorizer?: Authorizer;
    authCtx?: AuthorizationContext;
    pages?: PageRegistry;
    /** When set, inject the built-in File Manager into nav. */
    mediaNav?: {
      label: string;
      /** Empty / omitted → top-level root under `label`. */
      navigationGroup?: string;
      navigationSort: number;
      navigationIcon: string;
    };
  },
): NavigationGroup[] {
  const canView = (slug: string) => {
    if (!options?.authorizer || !options.authCtx) return true;
    return canViewResource(options.authorizer, options.authCtx, registry, slug);
  };

  const resourceGroups = registry
    .navigationGroups()
    .map((group) => ({
      name: group.name,
      items: group.items.filter((item) => canView(item.slug)),
    }))
    .filter((group) => group.items.length > 0);

  const pageItems = (options?.pages?.navigationItems() ?? []).filter((page) => {
    const PageClass = options?.pages?.pageClass(page.slug);
    if (!PageClass || !options?.authCtx) return true;
    return PageClass.canAccess(options.authCtx.user);
  });

  const mediaNav = options?.mediaNav;
  const mediaGroupName = mediaNav?.navigationGroup?.trim();
  const mediaItem = mediaNav
    ? {
        slug: 'media',
        label: mediaNav.label,
        icon: mediaNav.navigationIcon,
        navigationGroup: mediaGroupName || undefined,
        navigationSort: mediaNav.navigationSort,
      }
    : null;

  // No group → own top-level root (label + icon), not buried under System/General.
  if (mediaItem && !mediaGroupName && mediaNav) {
    const groups: Array<{ name: string; icon?: string; items: NavItem[] }> = [
      ...resourceGroups.map((group) => ({
        name: group.name,
        items: group.items as NavItem[],
      })),
      {
        name: mediaNav.label,
        icon: mediaNav.navigationIcon,
        items: [mediaItem],
      },
    ];
    return mergeNavigationGroups(groups, pageItems);
  }

  const extras = mediaItem
    ? [...pageItems, { ...mediaItem, navigationGroup: mediaGroupName }]
    : pageItems;

  return mergeNavigationGroups(resourceGroups, extras);
}

export async function buildShellContext(options: {
  config: ShamarConfig;
  registry: ResourceRegistry;
  pages?: PageRegistry;
  meta?: ResourceMeta | PageMeta;
  /** Active nav slug (resource or page). */
  currentSlug?: string;
  pageTitle: string;
  basePath?: string;
  branding?: ShamarConfig['branding'];
  /** Pre-resolved branding (skips resolveBrandingOverrides). */
  resolvedBranding?: ShamarBranding;
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
  /** Dev masquerade session (shared password login). */
  masquerade?: { active: true };
  notifications?: PanelNotification[];
  mediaNav?: {
    label: string;
    navigationGroup?: string;
    navigationSort: number;
    navigationIcon: string;
  };
  /** Extra links for the user avatar dropdown. */
  userMenuLinks?: Array<{ label: string; href: string; external?: boolean }>;
  /** Firefly-parity navigation layout (default `app`). */
  navigationType?: import('@shamar/core').NavigationTypeInput;
  /** SIDE group mode (default `static`). */
  sideNavMode?: import('@shamar/core').SideNavModeInput;
  /** Panel chrome theme (Firefly `theme(...)`). */
  theme?: ShamarTheme | null;
  /** Explicit panel id; falls back to `authCtx.panelId`. */
  panelId?: string;
}): Promise<AdminShellContext> {
  const basePath = panelPathPrefix(options.basePath ?? options.config.path ?? '/admin');
  const groups = navigationGroups(options.registry, {
    authorizer: options.authorizer,
    authCtx: options.authCtx,
    pages: options.pages,
    mediaNav: options.mediaNav,
  });
  const currentSlug = options.currentSlug ?? options.meta?.slug;
  const menu = menuLayoutContext(
    groups,
    basePath,
    currentSlug,
    options.pageTitle,
    options.recordBreadcrumb,
    {
      navigationType: options.navigationType,
      sideNavMode: options.sideNavMode,
    },
  );
  const brandingInput = options.branding ?? options.config.branding;
  const branding =
    options.resolvedBranding ??
    (await resolveEffectiveBranding(
      brandingInput,
      options.config.resolveBrandingOverrides,
      {
        panelId: options.authCtx?.panelId,
        companyId: options.authCtx?.companyId ?? options.authCtx?.user?.companyId,
        user: options.authCtx?.user ?? null,
      },
    ));
  const authUser = options.authCtx?.user;
  const userName = authUser?.name ?? brandingInput?.name ?? branding.brandName;
  const flash = options.flash;
  const flashJson = flash ? JSON.stringify(flash).replace(/</g, '\\u003c') : undefined;
  const contentMaxWidth = resolveContentMaxWidth(
    options.meta?.contentMaxWidth ?? options.panelContentMaxWidth,
  );
  const theme = resolvePanelTheme(options.theme);
  const themeChrome = resolveThemeChrome(theme);
  const themeHead = resolveThemeHead(theme, {
    basePath,
    authDocument: false,
  });
  const themePartials = resolveThemePartials(theme);

  return {
    basePath,
    panelId: options.panelId || options.authCtx?.panelId || 'admin',
    panelTitle: branding.brandName,
    pageTitle: options.pageTitle,
    branding,
    navGroups: groups,
    navigationType: menu.navigationType,
    sideNavMode: menu.sideNavMode,
    sidebarOffcanvas: menu.sidebarOffcanvas,
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
    profilePath: options.config.auth?.profilePath,
    showCreateButton: options.showCreateButton,
    showEditButton: options.showEditButton,
    showDeleteButton: options.showDeleteButton,
    showBackToList: options.showBackToList,
    flash,
    flashJson,
    masquerade: options.masquerade,
    contentMaxWidthClass: contentMaxWidth.className,
    contentMaxWidthStyle: contentMaxWidth.style,
    globalSearchHtml: mountGlobalSearch(basePath),
    notificationsHtml: mountNotifications(basePath, options.notifications ?? []),
    userMenuLinks: options.userMenuLinks?.length ? options.userMenuLinks : undefined,
    themeChrome,
    themeHead,
    themePartials,
    themeId: theme.id(),
  };
}

export function buildListContext(options: {
  basePath: string;
  meta: ResourceMeta;
  query: ListViewQuery;
  result: PaginatedResult;
  defaultPerPage?: number;
}): { query: ListViewQuery; pagination: PaginationContext; perPageValue: string } {
  const defaultPerPage = options.defaultPerPage ?? DEFAULT_LIST_PER_PAGE;
  const query = normalizeListQuery(options.query, { perPage: defaultPerPage });
  const pagination = buildPaginationContext(
    options.basePath,
    options.meta.slug,
    query,
    options.result,
    { defaultPerPage },
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
