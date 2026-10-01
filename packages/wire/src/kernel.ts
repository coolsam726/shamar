import { escapeAttr } from './html.js';
import { invokeMethod, type WireComponent } from './component.js';
import { newComponentId, signSnapshot, verifySnapshot, type WireSnapshot } from './snapshot.js';

export interface WireDefinition {
  create(): WireComponent;
  /**
   * Reload server-owned state after the snapshot is restored and before
   * the request's updates and calls run. Use this for lists that live in a
   * store, and keep client flags (such as `open`) yourself.
   */
  refresh?(component: WireComponent): Promise<void> | void;
  /** `slots` holds already-rendered child islands, keyed by slot name. */
  render(component: WireComponent, slots?: Record<string, string>): string;
}

export interface WireRequest {
  snapshot: WireSnapshot;
  updates?: Record<string, unknown>;
  calls?: Array<{ method: string; params?: unknown[] }>;
}

/**
 * HTML attributes arrive as strings. When the class field is a number or
 * boolean, `<wire:counter count="4" />` should still seed that field.
 */
function seedValue(current: unknown, incoming: unknown): unknown {
  if (typeof current === 'number' && typeof incoming === 'string' && /^-?\d+(\.\d+)?$/.test(incoming)) {
    return Number(incoming);
  }
  if (typeof current === 'boolean' && typeof incoming === 'string') {
    return incoming === 'true' || incoming === '1';
  }
  return incoming;
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

  /**
   * `slots` maps a slot name to a child component name. Children are separate
   * islands: they keep their own snapshot and the browser does not morph them
   * when the parent re-renders.
   */
  mount(
    name: string,
    endpoint: string,
    slots?: Record<string, string>,
    state?: Record<string, unknown>,
  ): WireEnvelope {
    const definition = this.require(name);
    const component = definition.create();
    if (state) {
      for (const [key, value] of Object.entries(state)) {
        if (key in component.data) component.data[key] = seedValue(component.data[key], value);
      }
    }
    const nested = this.mountChildren(slots, endpoint);
    const snapshot = signSnapshot(this.secret, {
      id: newComponentId(),
      name,
      data: { ...component.data },
      children: nested.snapshots,
    });
    return {
      snapshot,
      html: this.island(endpoint, snapshot, definition.render(component, nested.html)),
    };
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
    await definition.refresh?.(component);

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

    const nested = this.renderChildren(incoming.children, endpoint);
    const snapshot = signSnapshot(this.secret, {
      id: incoming.id,
      name: incoming.name,
      data: { ...component.data },
      children: incoming.children,
    });
    const effects = component.effects?.redirect ? { redirect: component.effects.redirect } : undefined;
    return {
      snapshot,
      html: this.island(endpoint, snapshot, definition.render(component, nested)),
      effects,
    };
  }

  private mountChildren(
    slots: Record<string, string> | undefined,
    endpoint: string,
  ): { snapshots?: Record<string, WireSnapshot>; html: Record<string, string> } {
    if (!slots || Object.keys(slots).length === 0) return { html: {} };
    const snapshots: Record<string, WireSnapshot> = {};
    const html: Record<string, string> = {};
    for (const [slot, childName] of Object.entries(slots)) {
      const child = this.mount(childName, endpoint);
      snapshots[slot] = child.snapshot;
      html[slot] = child.html;
    }
    return { snapshots, html };
  }

  private renderChildren(
    children: Record<string, WireSnapshot> | undefined,
    endpoint: string,
  ): Record<string, string> {
    const html: Record<string, string> = {};
    for (const [slot, child] of Object.entries(children ?? {})) {
      if (!verifySnapshot(this.secret, child)) {
        throw new Error('Invalid wire snapshot');
      }
      const definition = this.require(child.name);
      const component = definition.create();
      for (const key of Object.keys(component.data)) {
        if (key in (child.data ?? {})) component.data[key] = child.data[key];
      }
      html[slot] = this.island(endpoint, child, definition.render(component));
    }
    return html;
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
