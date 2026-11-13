import type { BrandDisplay, PanelBranding, PanelConfig, PanelOrm } from './types.js';
import type { Page } from './page.js';
import type { DashboardPage } from './dashboard-page.js';
import type { Resource } from './resource.js';
import type { MaxWidthInput } from './content-max-width.js';
import {
  normalizeNavigationType,
  normalizeSideNavMode,
  type NavigationTypeInput,
  type SideNavModeInput,
} from './navigation.js';
import type { ShamarTheme } from './theme.js';

/**
 * Filament-style panel builder.
 *
 * @example
 * panel('admin').path('/admin').discoverResources('app/panels/admin/resources')
 */
export class PanelBuilder {
  private config: PanelConfig;

  constructor(id: string) {
    this.config = {
      id,
      path: `/${id}`,
      resources: [],
      pages: [],
    };
  }

  path(value: string): this {
    this.config.path = value.startsWith('/') ? value : `/${value}`;
    return this;
  }

  /**
   * Panel chrome branding. Merges over global `defineConfig({ branding })`.
   * Set `primaryColor` / `accentColor` here to theme a panel independently.
   *
   * @example
   * panel('admin').branding({
   *   name: 'Admin',
   *   primaryColor: '#0ea5e9',
   *   accentColor: '#334155',
   *   logo: '/images/logo.svg',
   *   logoHeight: 36,
   *   brandDisplay: 'both',
   * })
   */
  branding(value: PanelBranding): this {
    this.config.branding = { ...this.config.branding, ...value };
    return this;
  }

  /**
   * Panel chrome theme (Kona Firefly `theme(...)` parity).
   * Pass a {@link ShamarTheme} subclass. Default is {@link import('./theme.js').DefaultTheme}.
   *
   * @example panel('admin').theme(new HarborTheme())
   */
  theme(value: ShamarTheme): this {
    this.config.theme = value;
    return this;
  }

  /** Brand primary. Dark mode uses a shade unless {@link PanelBranding.darkPrimaryColor} is set. */
  primary(color: string): this {
    return this.branding({ primaryColor: color });
  }

  /** Brand accent. Dark mode uses a shade unless {@link PanelBranding.darkAccentColor} is set. */
  accent(color: string): this {
    return this.branding({ accentColor: color });
  }

  /** Explicit dark primary (Firefly `darkPrimary(...)`). */
  darkPrimary(color: string): this {
    return this.branding({ darkPrimaryColor: color });
  }

  /** Explicit dark accent (Firefly `darkAccent(...)`). */
  darkAccent(color: string): this {
    return this.branding({ darkAccentColor: color });
  }

  /**
   * Control whether the shell shows logo, brand name, or both.
   * Equivalent to `.branding({ brandDisplay })`.
   *
   * @example panel('admin').brandDisplay('logo')
   * @example panel('admin').brandDisplay('name')
   * @example panel('admin').brandDisplay('both')
   */
  brandDisplay(mode: BrandDisplay): this {
    this.config.branding = { ...this.config.branding, brandDisplay: mode };
    return this;
  }

  /** Shorthand: `.brandDisplay('logo')`. */
  brandLogoOnly(): this {
    return this.brandDisplay('logo');
  }

  /** Shorthand: `.brandDisplay('name')`. */
  brandNameOnly(): this {
    return this.brandDisplay('name');
  }

  /** Shorthand: `.brandDisplay('both')`. */
  brandLogoAndName(): this {
    return this.brandDisplay('both');
  }

  orm(value: PanelOrm): this {
    this.config.orm = value;
    return this;
  }

  resources(list: Array<typeof Resource>): this {
    this.config.resources = [...this.config.resources, ...list];
    return this;
  }

  pages(list: Array<typeof Page>): this {
    this.config.pages = [...(this.config.pages ?? []), ...list];
    return this;
  }

  discoverResources(dir: string): this {
    this.config.discover = dir;
    return this;
  }

  /**
   * Discover Filament-style pages under a directory (`*_page.ts` / `*Page.ts`).
   */
  discoverPages(dir: string): this {
    this.config.discoverPages = dir;
    return this;
  }

  /**
   * Default max width for create/edit and show/infolist pages.
   * Prefer {@link import('./content-max-width.js').MaxWidth} for IDE autocomplete,
   * Tailwind tokens (`sm`/`md`/`lg`, `7xl`, `screen-lg`, `container`, `prose`, `[1200px]`),
   * or a CSS length (`80rem`, `1200px`). Filament short aliases (`s`/`screen-l`) and
   * full `max-w-*` classes remain accepted.
   * Omit to use the built-in default (`screen-xl`).
   *
   * @example panel('admin').contentMaxWidth(MaxWidth.Screen2Xl)
   * @example panel('admin').contentMaxWidth(MaxWidth.Lg)
   * @example panel('admin').contentMaxWidth('[80rem]')
   */
  contentMaxWidth(value: MaxWidthInput): this {
    this.config.contentMaxWidth = value;
    return this;
  }

  /**
   * Filament / Kona alias of {@link contentMaxWidth}.
   *
   * @example panel('admin').maxContentWidth(MaxWidth.ScreenLg)
   * @example panel('admin').maxContentWidth('screen-2xl')
   * @example panel('admin').maxContentWidth('container')
   * @example panel('admin').maxContentWidth('[1200px]')
   */
  maxContentWidth(value: MaxWidthInput): this {
    return this.contentMaxWidth(value);
  }

  /**
   * Default list page size when the request omits `perPage`.
   * Resources can override with `static defaultPerPage`. Built-in default: `15`.
   *
   * @example panel('admin').defaultPerPage(25)
   */
  defaultPerPage(value: number): this {
    this.config.defaultPerPage = value;
    return this;
  }

  /**
   * Allow authenticated users with no roles (and no direct permissions) into this panel.
   * Default is to deny empty authorization.
   */
  allowUsersWithoutRoles(value = true): this {
    this.config.allowUsersWithoutRoles = value;
    return this;
  }

  /**
   * Replace the panel home dashboard (`GET /`).
   *
   * @example panel('admin').dashboardPage(AdminDashboard)
   */
  dashboardPage(pageClass: typeof DashboardPage): this {
    this.config.dashboardPage = pageClass;
    return this;
  }

  /**
   * Extra links in the user avatar dropdown (other panels, docs, marketing site).
   *
   * @example
   * panel('admin').userMenuLinks([
   *   { label: 'App panel', href: '/app' },
   *   { label: 'shamar.dev', href: 'https://shamar.dev', external: true },
   * ])
   */
  userMenuLinks(
    links: NonNullable<PanelConfig['userMenuLinks']>,
  ): this {
    this.config.userMenuLinks = [...links];
    return this;
  }

  /**
   * Where panel navigation links sit (Firefly parity).
   * Prefer {@link NavigationType} const keys for IDE autocomplete.
   * Mobile always uses a sidebar drawer + accordion regardless of this value.
   *
   * @example panel('admin').navigationType(NavigationType.SIDE)
   * @example panel('admin').navigation(NavigationType.TOP)
   * @example panel('admin').navigationType(NavigationType.APP_INVERSE)
   * @example panel('admin').navigationType('side') // string literals still accepted
   */
  navigationType(type: NavigationTypeInput): this {
    this.config.navigationType = normalizeNavigationType(type);
    return this;
  }

  /** Alias of {@link navigationType}. */
  navigation(type: NavigationTypeInput): this {
    return this.navigationType(type);
  }

  /** Shorthand: `.navigationType(NavigationType.TOP)`. */
  topNavigation(): this {
    return this.navigationType('top');
  }

  /**
   * How SIDE groups render on desktop. Default `static`. APP / INVERSE / TOP ignore this.
   * Mobile always uses accordion.
   *
   * @example panel('admin').navigationType(NavigationType.SIDE).sideNavMode('accordion')
   */
  sideNavMode(mode: SideNavModeInput): this {
    this.config.sideNavMode = normalizeSideNavMode(mode);
    return this;
  }

  /** Selects accordion SIDE groups when `on` is true (default true). */
  navigationAccordion(on = true): this {
    return this.sideNavMode(on ? 'accordion' : 'static');
  }

  build(): PanelConfig {
    return {
      ...this.config,
      resources: [...this.config.resources],
      pages: [...(this.config.pages ?? [])],
      userMenuLinks: this.config.userMenuLinks
        ? [...this.config.userMenuLinks]
        : undefined,
      navigationType: this.config.navigationType
        ? normalizeNavigationType(this.config.navigationType)
        : undefined,
      sideNavMode: this.config.sideNavMode
        ? normalizeSideNavMode(this.config.sideNavMode)
        : undefined,
    };
  }
}

export function panel(id: string): PanelBuilder {
  return new PanelBuilder(id);
}
