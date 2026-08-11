import type { BrandDisplay, PanelBranding, PanelConfig, PanelOrm } from './types.js';
import type { Page } from './page.js';
import type { Resource } from './resource.js';

/**
 * Filament-style panel builder.
 *
 * @example
 * panel('admin').path('/admin').discoverResources('app/resources/admin')
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
   * Prefer screen tokens for a container feel (`screen-lg`, `screen-xl`, `screen-2xl`),
   * or a scale token / CSS length (`7xl`, `80rem`, `full`, `none`).
   * Omit to use the built-in default (`screen-xl`).
   */
  contentMaxWidth(value: string): this {
    this.config.contentMaxWidth = value;
    return this;
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

  build(): PanelConfig {
    return {
      ...this.config,
      resources: [...this.config.resources],
      pages: [...(this.config.pages ?? [])],
    };
  }
}

export function panel(id: string): PanelBuilder {
  return new PanelBuilder(id);
}
