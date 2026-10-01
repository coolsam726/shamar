import { readFileSync } from 'node:fs';
import type { Router } from '@adonisjs/core/http';
import { wireClientPath, type WireKernel, type WireRequest } from '@shamar/wire';

export interface RegisterWireOptions {
  kernel: WireKernel;
  /**
   * POST target and script URL share this path.
   * Default `/wire` serves the script at `/wire.js` and updates at `POST /wire`.
   * `kernel.mount(name, prefix)` must use the same string.
   */
  prefix?: string;
  /**
   * When false, only `GET {prefix}.js` is registered. Use when a root-mounted
   * panel already owns `POST /wire` (AdminController falls through to the kernel).
   */
  registerPost?: boolean;
}

/**
 * Register Wire on an Adonis app that does not use a Shamar panel.
 *
 * ```ts
 * registerWire(router, { kernel, prefix: '/wire' })
 * ```
 *
 * The page that embeds an island must load `{prefix}.js` and, when CSRF is on,
 * expose the token in `<meta name="csrf-token">`.
 */
export function registerWire(router: Router, options: RegisterWireOptions): void {
  const prefix = (options.prefix ?? '/wire').replace(/\/$/, '') || '/wire';
  const scriptUrl = `${prefix}.js`;

  router.get(scriptUrl, async ({ response }) => {
    response.header('Content-Type', 'application/javascript; charset=utf-8');
    response.header('Cache-Control', 'no-cache');
    return response.send(readFileSync(wireClientPath(), 'utf8'));
  });

  if (options.registerPost === false) return;

  router.post(prefix, async ({ request, response }) => {
    try {
      const result = await options.kernel.update(request.body() as WireRequest, prefix);
      return response.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Wire request failed';
      return response.badRequest({ message });
    }
  });
}
