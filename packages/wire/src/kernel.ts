import { escapeAttr } from './html.js';
import { invokeMethod, type WireComponent } from './component.js';
import { newComponentId, signSnapshot, verifySnapshot, type WireSnapshot } from './snapshot.js';

export interface WireDefinition {
  create(): WireComponent;
  render(component: WireComponent): string;
}

export interface WireRequest {
  snapshot: WireSnapshot;
  updates?: Record<string, unknown>;
  calls?: Array<{ method: string; params?: unknown[] }>;
}

export interface WireEnvelope {
  snapshot: WireSnapshot;
  html: string;
  effects?: WireComponent['effects'];
}

export class WireKernel {
  constructor(
    private readonly secret: string,
    private readonly components: Record<string, WireDefinition>,
  ) {}

  mount(name: string, endpoint: string): WireEnvelope {
    const definition = this.require(name);
    const component = definition.create();
    const snapshot = signSnapshot(this.secret, {
      id: newComponentId(),
      name,
      data: { ...component.data },
    });
    return { snapshot, html: this.island(endpoint, snapshot, definition.render(component)) };
  }

  async update(request: WireRequest, endpoint: string): Promise<WireEnvelope> {
    const incoming = request?.snapshot;
    if (!incoming || !verifySnapshot(this.secret, incoming)) {
      throw new Error('Invalid wire snapshot');
    }
    const definition = this.require(incoming.name);
    const component = definition.create();
    for (const key of Object.keys(component.data)) {
      if (key in (incoming.data ?? {})) component.data[key] = incoming.data[key];
    }

    for (const [key, value] of Object.entries(request.updates ?? {})) {
      if (!(key in component.data)) continue;
      await component.updating?.(key, value);
      component.data[key] = value;
      await component.updated?.(key);
      const specific = `updated${key.charAt(0).toUpperCase()}${key.slice(1)}`;
      const hook = (component as unknown as Record<string, unknown>)[specific];
      if (typeof hook === 'function') await hook.call(component);
    }
    for (const call of request.calls ?? []) {
      await invokeMethod(component, call.method, call.params ?? []);
    }

    const snapshot = signSnapshot(this.secret, {
      id: incoming.id,
      name: incoming.name,
      data: { ...component.data },
    });
    const effects = component.effects?.redirect ? { redirect: component.effects.redirect } : undefined;
    return {
      snapshot,
      html: this.island(endpoint, snapshot, definition.render(component)),
      effects,
    };
  }

  private require(name: string): WireDefinition {
    const definition = this.components[name];
    if (!definition) throw new Error(`Unknown wire component: ${name}`);
    return definition;
  }

  private island(endpoint: string, snapshot: WireSnapshot, inner: string): string {
    const json = escapeAttr(JSON.stringify(snapshot));
    return `<div wire:id="${escapeAttr(snapshot.id)}" wire:snapshot="${json}" wire:endpoint="${escapeAttr(endpoint)}">${inner}</div>`;
  }
}
