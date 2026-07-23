import type { ShamarRestConfig } from './types.js';

const DEFAULTS = {
  enabled: true,
  openapiPath: '/openapi.json',
  docs: {
    enabled: true,
    path: '/docs',
    ui: 'scalar' as const,
  },
  openapi: {
    title: 'Shamar API',
    version: '1.0.0',
  },
  security: true,
  discover: {
    prefixes: ['/api'],
  },
};

export function defineRestConfig(config: ShamarRestConfig = {}): ShamarRestConfig {
  return {
    enabled: config.enabled ?? DEFAULTS.enabled,
    openapiPath: config.openapiPath ?? DEFAULTS.openapiPath,
    security: config.security ?? DEFAULTS.security,
    docs: {
      enabled: config.docs?.enabled ?? DEFAULTS.docs.enabled,
      path: config.docs?.path ?? DEFAULTS.docs.path,
      ui: config.docs?.ui ?? DEFAULTS.docs.ui,
    },
    openapi: {
      title: config.openapi?.title ?? DEFAULTS.openapi.title,
      version: config.openapi?.version ?? DEFAULTS.openapi.version,
      description: config.openapi?.description,
      servers: config.openapi?.servers,
    },
    discover:
      config.discover === false
        ? false
        : {
            prefixes: config.discover?.prefixes ?? DEFAULTS.discover.prefixes,
            exclude: config.discover?.exclude,
          },
  };
}

export function resolveRestConfig(config?: ShamarRestConfig | null): ReturnType<
  typeof defineRestConfig
> {
  return defineRestConfig(config ?? {});
}
