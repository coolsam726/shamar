import type {
  DataAdapter,
  PanelConfig,
  Resource,
  ResourceRegistry,
} from '@shamar/core';
import { panel as createPanel, type PanelBuilder } from '@shamar/core';

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
    loginPath?: string;
    guard?: string;
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
