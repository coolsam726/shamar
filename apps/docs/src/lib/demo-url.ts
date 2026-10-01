/**
 * Live panel host. Landing/docs are on shamar.dev; the panel is a separate
 * origin (demo.shamar.dev in production). Prefer absolute URLs so static
 * Cloudflare deploys do not leave relative `/demo` pointing at shamar.dev/demo.
 */
const FALLBACK_DEMO_ORIGIN = 'https://demo.shamar.dev';

export function demoOrigin(): string {
  const raw = (import.meta.env.PUBLIC_DEMO_URL as string | undefined)?.trim();
  if (raw) return raw.replace(/\/$/, '');
  // Dev without PUBLIC_DEMO_URL: relative `/` is wrong for the marketing site.
  // Prefer the production demo host so “Open live demo” always works.
  if (import.meta.env.DEV) return 'http://localhost:3333';
  return FALLBACK_DEMO_ORIGIN;
}

/** Absolute URL on the demo host. Paths like `/demo` or `/demo/products` map to `/` or `/products`. */
export function demoHref(path = '/'): string {
  const origin = demoOrigin();
  let p = path.trim() || '/';
  if (p === '/demo' || p === '/demo/') p = '/';
  else if (p.startsWith('/demo?')) p = `/${p.slice('/demo'.length)}`;
  else if (p.startsWith('/demo/')) p = p.slice('/demo'.length);
  if (!p.startsWith('/')) p = `/${p}`;
  return `${origin}${p === '/' ? '/' : p}`;
}
