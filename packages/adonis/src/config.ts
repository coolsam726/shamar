import type {
  AuthorizerOptions,
  CherubimUser,
  RoleResolver,
} from '@shamar/cherubim';
import type { PolicyClass } from '@shamar/core';
import type {
  DataAdapter,
  PanelConfig,
  Resource,
  ResourceRegistry,
} from '@shamar/core';
import { panel as createPanel, type PanelBuilder } from '@shamar/core';
import type { ShamarHttpContext } from './context.js';

export type ShamarOrm = 'lucid' | 'mongoose';

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
  };
  /** Default branding inherited by panels without their own. */
  branding?: PanelConfig['branding'];
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
        branding: built.branding ?? config.branding,
        resources: [...(built.resources ?? [])],
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
    },
  ];
}
