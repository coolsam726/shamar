import type { WireDefinition, WireComponent } from '@shamar/wire';

type Ctor = new () => object;

const SKIP = new Set(['effects', 'constructor']);

/** Public fields on a class instance become snapshot `data`. */
export function readWireState(instance: object): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of Object.keys(instance)) {
    if (SKIP.has(key)) continue;
    const value = (instance as Record<string, unknown>)[key];
    if (typeof value === 'function') continue;
    data[key] = value;
  }
  return data;
}

function prototypeMethods(instance: object): string[] {
  const names: string[] = [];
  let cursor: object | null = instance;
  while (cursor && cursor !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(cursor)) {
      if (name === 'constructor' || SKIP.has(name)) continue;
      const value = (cursor as Record<string, unknown>)[name];
      if (typeof value === 'function') names.push(name);
    }
    cursor = Object.getPrototypeOf(cursor);
  }
  return [...new Set(names)];
}

/**
 * Adapt a Livewire-style class (`count = 0`, `increment()`) to the kernel.
 * `render` receives the public state, usually from an Edge view.
 */
export function wireDefinitionFromClass(
  ComponentClass: Ctor,
  render: (data: Record<string, unknown>) => string,
): WireDefinition {
  const definition: WireDefinition = {
    create() {
      const instance = new ComponentClass() as Record<string, unknown>;
      const component = { data: readWireState(instance) } as WireComponent & Record<string, unknown>;

      const syncToInstance = () => {
        Object.assign(instance, component.data);
      };
      const syncToData = () => {
        for (const key of Object.keys(component.data)) {
          component.data[key] = instance[key];
        }
        if (instance.effects && typeof instance.effects === 'object') {
          component.effects = instance.effects as WireComponent['effects'];
        }
      };

      for (const name of prototypeMethods(instance)) {
        const fn = instance[name];
        if (typeof fn !== 'function') continue;
        component[name] = async (...args: unknown[]) => {
          syncToInstance();
          const result = await fn.apply(instance, args);
          syncToData();
          return result;
        };
      }

      return component;
    },
    render(component) {
      return render(component.data);
    },
  };
  if (typeof (ComponentClass.prototype as { refresh?: unknown }).refresh === 'function') {
    definition.refresh = async (component) => {
      const hook = (component as unknown as { refresh?: () => Promise<void> | void }).refresh;
      if (typeof hook === 'function') await hook.call(component);
    };
  }
  return definition;
}

export class Wire {
  effects?: { redirect?: string };
  /** Tag used in `@wire('name')`. Defaults to the file path. */
  static componentName?: string;
  /** Edge view under `resources/views/wire`, without `.edge`. Defaults to the file path. */
  static view?: string;
}
