import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ApplicationService } from '@adonisjs/core/types';
import type { ShamarConfig } from './config.js';
import { createShamarRuntime } from './runtime.js';
import { registerShamarRoutes } from './routes.js';
import { resolveGridItemStyle } from '@shamar/core';
import type { WireDefinition } from '@shamar/wire';
import './types.js';

export default class ShamarProvider {
  constructor(protected app: ApplicationService) {}

  register(): void {
    this.app.container.singleton('shamar.runtime', async () => {
      const config = this.app.config.get<ShamarConfig>('shamar');
      const { withDiscoveredPanels } = await import('./discover_panels.js');
      const panels = await withDiscoveredPanels(config, this.app.makePath());
      return createShamarRuntime(panels, { appRoot: this.app.makePath() });
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

    this.app.container.singleton('shamar.authorizer', async () => {
      const runtime = await this.app.container.make('shamar.runtime');
      return runtime.authorizer;
    });

    this.app.container.singleton('shamar.panels', async () => {
      const runtime = await this.app.container.make('shamar.runtime');
      return runtime.panels;
    });
  }

  async boot(): Promise<void> {
    await this.bootDiscoveredWire();
    const configured = this.app.config.get<ShamarConfig | null>('shamar', null);
    if (!configured) return;

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
        pageSectionSortColumnUrl,
        cellValue,
        detailValue,
        badgeValues,
        fieldChecked,
        formInputType,
        fieldInputAttrs,
        recordNavQuery,
        relatedListLink,
      } = await import('./shamar/list-query.js');

      edge.global('sortColumnUrl', sortColumnUrl);
      edge.global('pageSectionSortColumnUrl', pageSectionSortColumnUrl);
      edge.global('cellValue', cellValue);
      edge.global('detailValue', detailValue);
      edge.global('badgeValues', badgeValues);
      edge.global('fieldChecked', fieldChecked);
      edge.global('formInputType', formInputType);
      edge.global('fieldInputAttrs', fieldInputAttrs);
      edge.global('recordNavQuery', recordNavQuery);
      edge.global('relatedListLink', relatedListLink);
      edge.global('resolveGridItemStyle', resolveGridItemStyle);
      const { partitionRowActions } = await import('./shamar/resource-actions.js');
      edge.global('partitionRowActions', partitionRowActions);
      const { humanizeLabel, resolveAlignmentClass, alignmentTextClass, emptyRepeaterItem, repeaterSchema } = await import('@shamar/core');
      edge.global('humanizeLabel', humanizeLabel);
      edge.global('resolveAlignmentClass', resolveAlignmentClass);
      edge.global('alignmentTextClass', alignmentTextClass);
      const { fieldView } = await import('./shamar/field-views.js');
      const { fieldStateRef } = await import('./shamar/field-payload.js');
      edge.global('fieldView', fieldView);
      edge.global('fieldStateRef', fieldStateRef);
      edge.global('times', (count: number) => {
        const n = Math.max(0, Math.min(24, Number(count) || 0));
        return Array.from({ length: n }, (_, index) => index + 1);
      });
      edge.global('repeaterSchemaNodes', (field: { widget?: Record<string, unknown> }) => {
        return repeaterSchema(field)?.schema ?? [];
      });
      edge.global('repeaterEmptyItem', (field: { widget?: Record<string, unknown> }) => {
        const schema = repeaterSchema(field);
        return schema ? emptyRepeaterItem(schema) : {};
      });
      edge.global('jsonAttr', (value: unknown) => {
        return JSON.stringify(value ?? null).replace(/</g, '\\u003c');
      });
    }

    await registerShamarRoutes(this.app, router, runtime);
  }

  /**
   * Livewire-style host: every class in `app/wire` is a component.
   * Routes `POST /wire` and `GET /wire.js` are registered even when that
   * folder is empty. A missing `shamar` config skips the admin panel only.
   *
   * When a panel mounts at `/`, it owns `POST /wire` for its islands. Skip the
   * kernel POST here so Adonis does not see a duplicate; AdminController.wire
   * falls through to the discovered kernel for app/wire components.
   */
  private async bootDiscoveredWire(): Promise<void> {
    const { randomBytes } = await import('node:crypto');
    const { WireKernel, escapeHtml } = await import('@shamar/wire');
    const { discoverWireComponents } = await import('./wire/discover.js');
    const { wireDefinitionFromClass } = await import('./wire/class_component.js');
    const { registerWire } = await import('./wire/register.js');
    const { registerWireTag } = await import('./wire/edge_tag.js');
    const { panelPathPrefix } = await import('./shamar/paths.js');

    const discovered = await discoverWireComponents(this.app.makePath());
    const components: Record<string, WireDefinition> = {};
    const edge = this.app.usingEdgeJS ? (await import('edge.js')).default : null;
    if (edge) {
      try {
        edge.mount('wire', join(this.app.makePath(), 'resources/views/wire'));
      } catch {
        /* disk already mounted */
      }
    }

    for (const item of discovered) {
      if (components[item.name]) {
        throw new Error(`Duplicate Wire component "${item.name}"`);
      }
      const view = item.view;
      components[item.name] = wireDefinitionFromClass(item.Class, (data) => {
        if (!edge) return '<p>Edge is required to render Wire views.</p>';
        try {
          return edge.renderSync(`wire::${view}`, data);
        } catch (error) {
          const detail = error instanceof Error ? error.message : 'Unable to render the view';
          return `<p>Missing or invalid view resources/views/wire/${escapeHtml(view)}.edge. ${escapeHtml(detail)}</p>`;
        }
      });
    }

    const configuredKey = process.env.APP_KEY?.trim();
    const secret = configuredKey || randomBytes(32).toString('hex');
    const kernel = new WireKernel(secret, components);
    this.app.container.singleton('shamar.wire', () => kernel);

    if (edge) {
      edge.global(
        'wire',
        (name: string, props?: Record<string, unknown>) => kernel.mount(name, '/wire', undefined, props).html,
      );
      try {
        registerWireTag(edge as never);
      } catch {
        /* tag already registered */
      }
    }

    const router = await this.app.container.make('router');
    const configured = this.app.config.get<ShamarConfig | null>('shamar', null);
    let registerPost = true;
    if (configured) {
      const runtime = await this.app.container.make('shamar.runtime');
      registerPost = !runtime.panels.some((panel) => panelPathPrefix(panel.path) === '');
    }

    registerWire(router, { kernel, registerPost });
  }
}
