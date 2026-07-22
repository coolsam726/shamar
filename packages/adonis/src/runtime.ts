import {
  ResourceRegistry,
  type DataAdapter,
  type PanelConfig,
  type Resource,
} from '@shamar/core';
import { createLucidAdapter } from '@shamar/lucid';
import { createMongooseAdapter } from '@shamar/mongoose';
import { defineConfig, type ShamarConfig, type ShamarOrm } from './config.js';
import { discoverResources } from './discover.js';

export interface PanelRuntime {
  id: string;
  path: string;
  config: PanelConfig;
  registry: ResourceRegistry;
  adapter: DataAdapter;
}

export interface ShamarRuntime {
  config: ShamarConfig & { panels: PanelConfig[] };
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
  const panels: PanelRuntime[] = [];

  for (const panelConfig of resolved.panels) {
    let resources = [...panelConfig.resources];
    if (panelConfig.discover && options.appRoot) {
      const discovered = await discoverResources(options.appRoot, panelConfig.discover);
      resources = mergeResources(resources, discovered);
    }

    const panelResolved: PanelConfig = { ...panelConfig, resources };
    panels.push({
      id: panelResolved.id,
      path: panelResolved.path,
      config: panelResolved,
      registry: new ResourceRegistry(resources),
      adapter: resolveAdapter(resolved, panelResolved),
    });
  }

  if (panels.length === 0) {
    throw new Error('Shamar config must define at least one panel');
  }

  const first = panels[0]!;

  return {
    config: resolved,
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

function mergeResources(
  explicit: Array<typeof Resource>,
  discovered: Array<typeof Resource>,
): Array<typeof Resource> {
  const bySlug = new Map<string, typeof Resource>();
  for (const resource of [...discovered, ...explicit]) {
    bySlug.set(resource.slug, resource);
  }
  return [...bySlug.values()];
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
