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
