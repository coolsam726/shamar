import type { PanelBranding, PanelConfig, PanelOrm } from './types.js';
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
    };
  }

  path(value: string): this {
    this.config.path = value.startsWith('/') ? value : `/${value}`;
    return this;
  }

  branding(value: PanelBranding): this {
    this.config.branding = value;
    return this;
  }

  orm(value: PanelOrm): this {
    this.config.orm = value;
    return this;
  }

  resources(list: Array<typeof Resource>): this {
    this.config.resources = [...this.config.resources, ...list];
    return this;
  }

  discoverResources(dir: string): this {
    this.config.discover = dir;
    return this;
  }

  build(): PanelConfig {
    return {
      ...this.config,
      resources: [...this.config.resources],
    };
  }
}

export function panel(id: string): PanelBuilder {
  return new PanelBuilder(id);
}
