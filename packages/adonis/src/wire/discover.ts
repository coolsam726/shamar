import { readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SOURCE_FILE = /\.(?:ts|js|mts|mjs)$/;

export interface DiscoveredWire {
  /** Tag name used by `@wire('posts.create')`. */
  name: string;
  /** Edge template under `resources/views/wire`, without the disk prefix. */
  view: string;
  Class: new () => object;
}

/**
 * Load `app/wire/**` (Livewire's `app/Livewire` equivalent).
 * `app/wire/counter.ts` → `counter`. `app/wire/posts/create_form.ts` → `posts.create-form`.
 */
export async function discoverWireComponents(
  appRoot: string,
  relativeDir = 'app/wire',
): Promise<DiscoveredWire[]> {
  const root = resolve(appRoot, relativeDir);
  const files = await walk(root);
  const found: DiscoveredWire[] = [];

  for (const file of files) {
    const normalized = file.replace(/\\/g, '/');
    if (!SOURCE_FILE.test(normalized) || normalized.endsWith('.d.ts')) continue;
    const mod = await import(pathToFileURL(file).href);
    const Class = mod.default;
    if (typeof Class !== 'function') continue;
    const view = viewPath(root, file, Class);
    const name =
      typeof Class.componentName === 'string' && Class.componentName.trim()
        ? Class.componentName.trim()
        : nameFromView(view);
    found.push({ name, view, Class });
  }

  return found;
}

function viewPath(root: string, file: string, Class: { view?: string }): string {
  if (typeof Class.view === 'string' && Class.view.trim()) {
    return Class.view.trim().replace(/^wire\//, '').replace(/\.edge$/, '');
  }
  const rel = relative(root, file).replace(/\\/g, '/');
  return rel.replace(SOURCE_FILE, '');
}

function nameFromView(view: string): string {
  return view
    .split('/')
    .filter(Boolean)
    .map((segment) =>
      segment
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/_/g, '-')
        .toLowerCase(),
    )
    .join('.');
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
