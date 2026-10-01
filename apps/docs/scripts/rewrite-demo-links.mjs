#!/usr/bin/env node
/**
 * Static Cloudflare deploys do not run Astro middleware. Rewrite leftover
 * root-relative /demo and /login hrefs in built HTML to the demo host.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const origin = (process.env.PUBLIC_DEMO_URL || 'https://demo.shamar.dev').replace(/\/$/, '');

function rewriteHref(url) {
  if (url === '/login' || url.startsWith('/login/') || url.startsWith('/login?')) {
    return `${origin}${url}`;
  }
  if (url === '/demo' || url === '/demo/') return `${origin}/`;
  if (url.startsWith('/demo?')) return `${origin}/${url.slice('/demo'.length)}`;
  if (url.startsWith('/demo/')) return `${origin}${url.slice('/demo'.length)}`;
  return null;
}

const ATTR = /((?:href|src)=["'])(\/[^"']*)(["'])/g;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  let changed = 0;
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      changed += await walk(full);
      continue;
    }
    if (!entry.name.endsWith('.html')) continue;
    const before = await readFile(full, 'utf8');
    const after = before.replace(ATTR, (whole, open, url, close) => {
      const next = rewriteHref(url);
      return next ? `${open}${next}${close}` : whole;
    });
    if (after !== before) {
      await writeFile(full, after);
      changed += 1;
    }
  }
  return changed;
}

const n = await walk(dist);
console.log(`rewrite-demo-links: updated ${n} HTML file(s) → ${origin}`);
