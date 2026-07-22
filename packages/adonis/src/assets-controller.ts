import type { HttpContext } from '@adonisjs/core/http';
import { readFileSync } from 'node:fs';
import { buildBrandingCss, resolveBranding } from './shamar/branding.js';
import {
  shamarAdminCssPath,
  shamarAlpineJsPath,
  shamarUiJsPath,
} from './shamar/paths.js';
import type { ShamarConfig } from './config.js';

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
}
