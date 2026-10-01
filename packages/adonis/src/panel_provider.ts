import type { PanelBuilder, PanelConfig } from '@shamar/core';

/**
 * One admin area. Filament's `PanelProvider` and Orbit's `app/orbit/{id}/panel.py`
 * are this class: the app discovers it, and `config/shamar.ts` does not construct panels.
 *
 * @example
 * export default class AdminPanel extends PanelProvider {
 *   panel() {
 *     return panel('admin').path('/admin').discoverResources('app/panels/admin/resources')
 *   }
 * }
 */
export abstract class PanelProvider {
  abstract panel(): PanelBuilder | PanelConfig;
}

export function isPanelProviderClass(value: unknown): value is new () => PanelProvider {
  if (typeof value !== 'function') return false;
  const panel = (value as { prototype?: { panel?: unknown } }).prototype?.panel;
  return typeof panel === 'function';
}

export function panelConfigFromProvider(provider: PanelProvider): PanelConfig {
  const built = provider.panel();
  if (built && typeof (built as PanelBuilder).build === 'function') {
    return (built as PanelBuilder).build();
  }
  return built as PanelConfig;
}
