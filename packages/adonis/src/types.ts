import type { DataAdapter, ResourceRegistry } from '@shamar/core';
import type { Authorizer } from '@shamar/cherubim';
import type { AuthorizationContext } from '@shamar/cherubim';
import type { ShamarRuntime, PanelRuntime } from './runtime.js';
import type { ShamarConfig } from './config.js';

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    'shamar.runtime': ShamarRuntime;
    'shamar.config': ShamarConfig;
    'shamar.registry': ResourceRegistry;
    'shamar.adapter': DataAdapter;
    'shamar.panels': PanelRuntime[];
    'shamar.authorizer': Authorizer;
  }
}
