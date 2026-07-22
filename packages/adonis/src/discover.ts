import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Resource } from '@shamar/core';

/** Matches `*_resource.ts` and `*Resource.ts`. */
const RESOURCE_FILE = /(?:_resource|Resource)\.(?:ts|js|mts|mjs)$/;

/**
 * Discover Resource classes under a directory (relative to `appRoot`).
 * Matches `*_resource.ts` / `*Resource.ts` and loads default exports.
 */
export async function discoverResources(
  appRoot: string,
  relativeDir: string,
): Promise<Array<typeof Resource>> {
  const root = resolve(appRoot, relativeDir);
  const files = await walkFiles(root);
  const resources: Array<typeof Resource> = [];

  for (const file of files) {
    if (!RESOURCE_FILE.test(file.replace(/\\/g, '/'))) continue;
    const mod = await import(pathToFileURL(file).href);
    const candidate = mod.default ?? mod.Resource;
    if (isResourceClass(candidate)) {
      resources.push(candidate);
    }
  }

  return resources;
}

function isResourceClass(value: unknown): value is typeof Resource {
  return (
    typeof value === 'function' &&
    typeof (value as { configure?: unknown }).configure === 'function' &&
    typeof (value as { slug?: unknown }).slug === 'string'
  );
}

async function walkFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkFiles(full)));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}
