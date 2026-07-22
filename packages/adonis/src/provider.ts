import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ApplicationService } from '@adonisjs/core/types';
import type { ShamarConfig } from './config.js';
import { createShamarRuntime } from './runtime.js';
import { registerShamarRoutes } from './routes.js';
import { resolveGridItemStyle } from '@shamar/core';
import './types.js';

export default class ShamarProvider {
  constructor(protected app: ApplicationService) {}

  register(): void {
    this.app.container.singleton('shamar.runtime', async () => {
      const config = this.app.config.get<ShamarConfig>('shamar');
      return createShamarRuntime(config, { appRoot: this.app.makePath() });
    });

    this.app.container.singleton('shamar.config', async () => {
      const runtime = await this.app.container.make('shamar.runtime');
      return runtime.config;
    });

    this.app.container.singleton('shamar.registry', async () => {
      const runtime = await this.app.container.make('shamar.runtime');
      return runtime.registry;
    });

    this.app.container.singleton('shamar.adapter', async () => {
      const runtime = await this.app.container.make('shamar.runtime');
      return runtime.adapter;
    });

    this.app.container.singleton('shamar.panels', async () => {
      const runtime = await this.app.container.make('shamar.runtime');
      return runtime.panels;
    });
  }

  async boot(): Promise<void> {
    const runtime = await this.app.container.make('shamar.runtime');
    const router = await this.app.container.make('router');

    if (this.app.usingEdgeJS) {
      const { default: edge } = await import('edge.js');
      const viewsPath = join(
        dirname(fileURLToPath(import.meta.url)),
        '../resources/views/shamar',
      );
      edge.mount('shamar', viewsPath);

      const {
        sortColumnUrl,
        cellValue,
        detailValue,
        badgeValues,
        fieldChecked,
        formInputType,
        fieldInputAttrs,
        recordNavQuery,
      } = await import('./shamar/list-query.js');

      edge.global('sortColumnUrl', sortColumnUrl);
      edge.global('cellValue', cellValue);
      edge.global('detailValue', detailValue);
      edge.global('badgeValues', badgeValues);
      edge.global('fieldChecked', fieldChecked);
      edge.global('formInputType', formInputType);
      edge.global('fieldInputAttrs', fieldInputAttrs);
      edge.global('recordNavQuery', recordNavQuery);
      edge.global('resolveGridItemStyle', resolveGridItemStyle);
      const { humanizeLabel, resolveAlignmentClass, alignmentTextClass } = await import('@shamar/core');
      edge.global('humanizeLabel', humanizeLabel);
      edge.global('resolveAlignmentClass', resolveAlignmentClass);
      edge.global('alignmentTextClass', alignmentTextClass);
      edge.global('jsonAttr', (value: unknown) => {
        return JSON.stringify(value ?? null).replace(/</g, '\\u003c');
      });
    }

    await registerShamarRoutes(this.app, router, runtime);
  }
}
