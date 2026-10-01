import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isPanelProviderClass, panelConfigFromProvider, type PanelProvider } from './panel_provider.js';
import type { PanelBuilder, PanelConfig } from '@shamar/core';
import type { ShamarConfig } from './config.js';

const SOURCE = /\.(?:ts|js|mts|mjs)$/;
const PANEL_FILE = /(?:^|\/)panel\.(?:ts|js|mts|mjs)$/;
const PANEL_CLASS_FILE = /(?:_panel|Panel)\.(?:ts|js|mts|mjs)$/;

/**
 * Load panel classes from `app/panels`.
 * `app/panels/admin/panel.ts` (Orbit's layout) and `app/panels/admin_panel.ts` both count.
 */
export async function discoverPanelProviders(
  appRoot: string,
  relativeDir = 'app/panels',
): Promise<Array<new () => PanelProvider>> {
  const root = resolve(appRoot, relativeDir);
  const files = await walk(root);
  const found: Array<new () => PanelProvider> = [];

  for (const file of files) {
    const normalized = file.replace(/\\/g, '/');
    if (normalized.endsWith('.d.ts')) continue;
    if (!SOURCE.test(normalized)) continue;
    if (!PANEL_FILE.test(normalized) && !PANEL_CLASS_FILE.test(normalized)) continue;
    const mod = await import(pathToFileURL(file).href);
    const Class = mod.default;
    if (isPanelProviderClass(Class)) found.push(Class);
  }

  return found;
}

/**
 * Panel classes win when an id is listed both in `app/panels` and in config.
 * Config entries for other ids are kept, so an app can move one panel at a time.
 */
export async function withDiscoveredPanels(config: ShamarConfig, appRoot: string): Promise<ShamarConfig> {
  const classes = await discoverPanelProviders(appRoot);
  if (classes.length === 0) return config;

  const seen = new Set<string>();
  const panels: Array<PanelConfig | PanelBuilder> = [];
  for (const Class of classes) {
    const built = panelConfigFromProvider(new Class());
    if (!built.id) throw new Error('A panel class returned a panel without an id');
    if (seen.has(built.id)) throw new Error(`Duplicate panel "${built.id}"`);
    seen.add(built.id);
    panels.push(built);
  }

  for (const entry of config.panels ?? []) {
    const built =
      entry && typeof (entry as PanelBuilder).build === 'function'
        ? (entry as PanelBuilder).build()
        : (entry as PanelConfig);
    if (seen.has(built.id)) continue;
    seen.add(built.id);
    panels.push(entry);
  }

  return { ...config, panels };
}

async function walk(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}
