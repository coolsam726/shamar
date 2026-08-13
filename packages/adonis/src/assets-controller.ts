import type { HttpContext } from '@adonisjs/core/http';
import { readFileSync } from 'node:fs';
import { buildBrandingCss, resolveBranding } from './shamar/branding.js';
import {
  shamarAdminCssPath,
  shamarAlpineJsPath,
  shamarApexChartsPath,
  shamarChartJsPath,
  shamarFlowbiteDatepickerCssPath,
  shamarFlowbiteDatepickerJsPath,
  shamarRichEditorAssetPath,
  shamarUiJsPath,
} from './shamar/paths.js';
import type { ShamarConfig } from './config.js';
import { basename, extname } from 'node:path';

const RICH_EDITOR_FILES = new Set([
  'chrome.js',
  'document.js',
  'notion.js',
  'simple.js',
  'icons.js',
  'font_size.js',
  'numbering.js',
  'table_styles.js',
  'docx_table_styles.js',
  'export_docx.js',
  'import_office.js',
  'html_utils.js',
  'styles.css',
  'notion.css',
  'simple.css',
]);

export class AssetsController {
  constructor(
    private readonly config: ShamarConfig,
    private readonly panelBranding?: ShamarConfig['branding'],
  ) {}

  adminCss({ response }: HttpContext) {
    response.header('Content-Type', 'text/css; charset=utf-8');
    response.header('Cache-Control', 'public, max-age=3600');
    return response.send(readFileSync(shamarAdminCssPath(), 'utf8'));
  }

  shamarUi({ response }: HttpContext) {
    response.header('Content-Type', 'application/javascript; charset=utf-8');
    response.header('Cache-Control', 'no-cache');
    return response.send(readFileSync(shamarUiJsPath(), 'utf8'));
  }

  alpineJs({ response }: HttpContext) {
    response.header('Content-Type', 'application/javascript; charset=utf-8');
    response.header('Cache-Control', 'public, max-age=3600');
    return response.send(readFileSync(shamarAlpineJsPath(), 'utf8'));
  }

  brandingCss({ response }: HttpContext) {
    response.header('Content-Type', 'text/css; charset=utf-8');
    response.header('Cache-Control', 'no-cache');
    return response.send(
      buildBrandingCss(resolveBranding(this.panelBranding ?? this.config.branding)),
    );
  }

  flowbiteDatepickerCss({ response }: HttpContext) {
    response.header('Content-Type', 'text/css; charset=utf-8');
    response.header('Cache-Control', 'public, max-age=3600');
    return response.send(readFileSync(shamarFlowbiteDatepickerCssPath(), 'utf8'));
  }

  flowbiteDatepickerJs({ response }: HttpContext) {
    response.header('Content-Type', 'application/javascript; charset=utf-8');
    response.header('Cache-Control', 'public, max-age=3600');
    return response.send(readFileSync(shamarFlowbiteDatepickerJsPath(), 'utf8'));
  }

  apexCharts({ response }: HttpContext) {
    response.header('Content-Type', 'application/javascript; charset=utf-8');
    response.header('Cache-Control', 'public, max-age=3600');
    return response.send(readFileSync(shamarApexChartsPath(), 'utf8'));
  }

  chartJs({ response }: HttpContext) {
    response.header('Content-Type', 'application/javascript; charset=utf-8');
    response.header('Cache-Control', 'public, max-age=3600');
    return response.send(readFileSync(shamarChartJsPath(), 'utf8'));
  }

  richEditorAsset(ctx: HttpContext) {
    const { response, params } = ctx;
    const file = basename(String(params.file || ''));
    if (!RICH_EDITOR_FILES.has(file)) {
      return response.notFound({ message: 'Asset not found' });
    }
    const ext = extname(file);
    const type =
      ext === '.css'
        ? 'text/css; charset=utf-8'
        : 'application/javascript; charset=utf-8';
    response.header('Content-Type', type);
    response.header('Cache-Control', 'no-cache');
    return response.send(readFileSync(shamarRichEditorAssetPath(file), 'utf8'));
  }
}
