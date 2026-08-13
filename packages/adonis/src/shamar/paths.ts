import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

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
