import type {
  AuthLoginMode,
  AuthorizerOptions,
  CherubimUser,
  RoleResolver,
} from '@shamar/cherubim';
import type { MediaLibraryAdapter, PolicyClass } from '@shamar/core';
import type {
  DataAdapter,
  PanelConfig,
  Resource,
  ResourceRegistry,
} from '@shamar/core';
import { panel as createPanel, type PanelBuilder } from '@shamar/core';
import type { ShamarHttpContext } from './context.js';
import type { LdapAuthSettings } from './auth/ldap.js';
import {
  mergePanelBranding,
  type BrandingOverride,
  type BrandingOverrideContext,
} from './shamar/branding.js';
import type { MediaStorage } from './shamar/media-storage.js';

export type ShamarOrm = 'lucid' | 'mongoose';

export type { BrandingOverride, BrandingOverrideContext };

export interface ShamarMediaConfig {
  /** Enable the File Manager + FilePicker APIs (default false until configured). */
  enabled?: boolean;
  /** Storage disk name stored on media file records (default `shamar`). */
  disk?: string;
  /**
   * Local filesystem root for blob storage (relative to app root or absolute).
   * Default: `storage/media`.
   */
  root?: string;
  /** Inject a custom MediaLibraryAdapter (ORM metadata). */
  adapter?: MediaLibraryAdapter | (() => MediaLibraryAdapter);
  /** Inject custom blob storage (defaults to local disk under `root`). */
  storage?: MediaStorage | (() => MediaStorage);
  /**
   * Ungated public media URL prefix (default `/media`).
   * Public files are served at `{publicPath}/:id` without panel auth.
   */
  publicPath?: string;
  /** Nav label (default `Files`). */
  label?: string;
  /** Navigation group (default `System`). */
  navigationGroup?: string;
  navigationSort?: number;
  navigationIcon?: string;
}

export interface ShamarConfig {
  /** @deprecated Prefer `panels`. Kept for single-panel apps. */
  path?: string;
  /** JSON API prefix (default `/api/shamar`). */
  apiPrefix?: string;
  /** Default ORM for panels that omit `orm` (default `lucid`). */
  orm?: ShamarOrm;
  /** Escape hatch: supply your own DataAdapter (applies to every panel). */
  adapter?: DataAdapter | (() => DataAdapter);
  /**
   * @deprecated Prefer `panels[].resources` / `discoverResources`.
   * Used when `panels` is omitted (single default panel).
   */
  resources?: Array<typeof Resource>;
  /** Filament-style multi-panel registration. */
  panels?: Array<PanelConfig | PanelBuilder>;
  auth?: {
    model?: () => Promise<{ default: unknown }>;
    /** Redirect target when a panel route requires auth (default `/login`). */
    loginPath?: string;
    /** POST target for sign-out (shown in the admin shell when set). */
    logoutPath?: string;
    /**
     * Optional profile / account URL shown in the admin user dropdown
     * (e.g. `/admin/profile`). Host apps register the matching route.
     */
    profilePath?: string;
    /** Adonis auth guard name (default `web`). */
    guard?: string;
    /**
     * When `true`, panel routes require authentication.
     * Defaults to `true` when `guard` or `resolveUser` is set.
     */
    required?: boolean;
    /** Cherubim strict permission mode (default `true`). */
    strictPermissions?: boolean;
    /** Users matching this predicate bypass all authorization checks. */
    superUser?: AuthorizerOptions['superUser'];
    /** Merge role ids into user permissions. */
    roleResolver?: RoleResolver;
    /** Policy classes keyed by resource slug (Laravel / Adonis style). */
    policies?: Record<string, PolicyClass>;
    /**
     * API credentials (PATs + machine keys).
     *
     * Dual-header mode (recommended for mobile / public APIs):
     * - `X-Api-Key` — machine gateway key (overall API access)
     * - `Authorization: Bearer` — user PAT (endpoint identity)
     *
     * Single-credential mode still works: Bearer or X-Api-Key alone.
     */
    apiKeys?: {
      resolve: (
        plainText: string,
        ctx: ShamarHttpContext,
      ) => CherubimUser | null | Promise<CherubimUser | null>;
      /**
       * When `true`, apply {@link RequireApiKeyMiddleware} to the `/api/shamar`
       * route group. Omit (or `false`) so API keys are only required on routes
       * that explicitly use the middleware.
       */
      protectApi?: boolean;
      /**
       * When both gateway key and user are present, intersect the user’s
       * permissions with the machine key’s abilities (default `true`).
       */
      intersectGatewayAbilities?: boolean;
    };
    /** Custom principal resolver (overrides guard-based mapping). */
    resolveUser?: (ctx: ShamarHttpContext) => CherubimUser | null | Promise<CherubimUser | null>;
    /**
     * Password login strategy:
     * - `local` — local passwords only (default when no LDAP domains)
     * - `ldap` — LDAP directories only
     * - `both` — try LDAP first, then fall back to local
     */
    loginMode?: AuthLoginMode;
    /**
     * Copy for the published login page (`buildAuthLoginViewData`).
     * When omitted, sensible mode-based subtitles are used and the footer is hidden.
     */
    login?: {
      /** Subtitle under the brand name. */
      subtitle?: string;
      /** Optional hint under the form. Empty/omit hides it. */
      footer?: string;
      /** Placeholder for the username / email field. */
      usernamePlaceholder?: string;
      /** Label for the username / email field. */
      usernameLabel?: string;
    };
    /** Multi-domain LDAP directory settings. */
    ldap?: LdapAuthSettings;
    /**
     * Dev-only shared password: login as any existing local user.
     * Ignored unless `NODE_ENV !== 'production'` and `password` is non-empty.
     */
    masquerade?: {
      password?: string;
    };
  };
  /** Default branding inherited by panels without their own. */
  branding?: PanelConfig['branding'];
  /**
   * Optional runtime branding overrides (DB settings, company logo, etc.).
   * Applied after panel/config branding when rendering the admin shell (and login when awaited).
   *
   * @example
   * resolveBrandingOverrides: async ({ companyId }) => {
   *   const settings = await loadGlobalBranding()
   *   const company = companyId ? await Company.findById(companyId) : null
   *   return {
   *     logo: company?.logo || settings.logo,
   *     logoDark: company?.logoDark || settings.logoDark,
   *     logoHeight: company?.logoHeight ?? settings.logoHeight,
   *   }
   * }
   */
  resolveBrandingOverrides?: (
    ctx: BrandingOverrideContext,
  ) => BrandingOverride | null | undefined | Promise<BrandingOverride | null | undefined>;
  /**
   * Media library (File Manager + FilePicker).
   * Provide `adapter` (or register via ORM package models in the host app).
   */
  media?: ShamarMediaConfig;
  /**
   * Optional REST / OpenAPI docs settings (consumed by `@shamar/rest`).
   * Prefer nesting here or use a separate `config/shamar_rest.ts`.
   */
  rest?: {
    enabled?: boolean;
    openapiPath?: string;
    docs?: {
      enabled?: boolean;
      path?: string;
      ui?: 'scalar';
    };
    openapi?: {
      title?: string;
      version?: string;
      description?: string;
      servers?: Array<{ url: string; description?: string }>;
    };
    security?: boolean;
    discover?:
      | false
      | {
          prefixes?: string[];
          exclude?: string[];
        };
  };
}

export function defineConfig(config: ShamarConfig): ShamarConfig & { panels: PanelConfig[] } {
  const panels = normalizePanels(config);
  return {
    path: panels[0]?.path ?? '/admin',
    apiPrefix: '/api/shamar',
    orm: 'lucid',
    resources: panels[0]?.resources ?? [],
    ...config,
    panels,
  };
}

export { createPanel as panel };

function normalizePanels(config: ShamarConfig): PanelConfig[] {
  if (config.panels && config.panels.length > 0) {
    return config.panels.map((entry) => {
      const built = typeof (entry as PanelBuilder).build === 'function'
        ? (entry as PanelBuilder).build()
        : (entry as PanelConfig);
      return {
        ...built,
        orm: built.orm ?? config.orm,
        branding: mergePanelBranding(config.branding, built.branding),
        resources: [...(built.resources ?? [])],
        pages: [...(built.pages ?? [])],
      };
    });
  }

  return [
    {
      id: 'admin',
      path: config.path ?? '/admin',
      orm: config.orm,
      branding: config.branding,
      resources: [...(config.resources ?? [])],
      pages: [],
    },
  ];
}
