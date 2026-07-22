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
