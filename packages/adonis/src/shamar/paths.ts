import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wireClientPath } from '@shamar/wire';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * URL prefix for a panel. `/` and an empty path mount the panel at the host root.
 */
export function panelPathPrefix(path: string | undefined | null): string {
  if (path == null || path === '' || path === '/') return '';
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  return withSlash.replace(/\/+$/, '');
}

/** Built-in panel paths that must never be treated as resource/page slugs. */
export const PANEL_RESERVED_SLUGS = ['assets', 'profile', 'media'] as const;

/**
 * Route param matcher for `/:slug` so unknown paths (favicon, /demo bookmarks,
 * app routes like /login) are not captured when the panel mounts at `/`.
 */
export function panelSlugMatcher(slugs: Iterable<string>): RegExp {
  const reserved = new Set<string>(PANEL_RESERVED_SLUGS);
  const allowed = [...new Set(slugs)].filter((slug) => slug && !reserved.has(slug));
  if (allowed.length === 0) return /(?!)/; // never matches
  const escaped = allowed.map((slug) => slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`^(?:${escaped.join('|')})$`);
}

export function shamarAssetsDir(): string {
  return join(packageRoot, 'assets');
}

export function shamarAdminCssPath(): string {
  return join(shamarAssetsDir(), 'admin.css');
}

export function shamarAlpineJsPath(): string {
  return join(shamarAssetsDir(), 'alpine.min.js');
}

export function shamarUiJsPath(): string {
  return join(shamarAssetsDir(), 'shamar-ui.js');
}

export function shamarWireJsPath(): string {
  return wireClientPath();
}

export function shamarFlowbiteDatepickerCssPath(): string {
  return join(shamarAssetsDir(), 'vendor/flowbite-datepicker.min.css');
}

export function shamarFlowbiteDatepickerJsPath(): string {
  return join(shamarAssetsDir(), 'vendor/flowbite-datepicker.min.js');
}

export function shamarApexChartsPath(): string {
  return join(shamarAssetsDir(), 'vendor/apexcharts.min.js');
}

export function shamarChartJsPath(): string {
  return join(shamarAssetsDir(), 'vendor/chart.umd.min.js');
}

export function shamarRichEditorAssetPath(file: string): string {
  return join(shamarAssetsDir(), 'rich-editor', file);
}
