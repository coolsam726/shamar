import { defineMiddleware } from 'astro:middleware';

/**
 * Prefix author-written root-absolute URLs when the site is served under a
 * subpath (GitHub Pages at /shamar). Starlight already bases its own chrome;
 * Markdown links and screenshot `src` attributes are written as `/docs/…`
 * and `/screenshots/…`.
 *
 * `/demo` and `/login` stay on the live playground when PUBLIC_DEMO_URL is set.
 * At the domain root this middleware is a no-op.
 */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const DEMO_ORIGIN = (import.meta.env.PUBLIC_DEMO_URL || '').replace(/\/$/, '');

const ROOT_URL = /((?:href|src|data-lightbox-src)=")(\/[^"]*)(")/g;

function isDemoPath(url: string) {
  return url === '/demo' || url.startsWith('/demo/') || url.startsWith('/demo?') || url === '/login' || url.startsWith('/login');
}

/** Docs still write `/demo/...`. The live panel is the root of the demo host. */
function demoHref(url: string) {
  if (url === '/login' || url.startsWith('/login/') || url.startsWith('/login?')) {
    return `${DEMO_ORIGIN}${url}`;
  }
  if (url === '/demo' || url === '/demo/') return `${DEMO_ORIGIN}/`;
  if (url.startsWith('/demo?')) return `${DEMO_ORIGIN}/${url.slice('/demo'.length)}`;
  if (url.startsWith('/demo/')) return `${DEMO_ORIGIN}${url.slice('/demo'.length)}`;
  return `${DEMO_ORIGIN}${url}`;
}

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  if (!BASE && !DEMO_ORIGIN) return response;
  if (!response.headers.get('content-type')?.includes('text/html')) return response;

  const html = await response.text();
  const based = html.replace(ROOT_URL, (whole, open: string, url: string, close: string) => {
    if (url.startsWith('//') || url === BASE || url.startsWith(`${BASE}/`)) return whole;
    if (isDemoPath(url)) {
      return DEMO_ORIGIN ? `${open}${demoHref(url)}${close}` : whole;
    }
    if (!BASE) return whole;
    return `${open}${BASE}${url}${close}`;
  });

  const headers = new Headers(response.headers);
  headers.delete('content-length');

  return new Response(based, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
