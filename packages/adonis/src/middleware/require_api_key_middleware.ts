import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import {
  extractMachineApiKey,
  isMachineApiKeyPrincipal,
} from '@shamar/cherubim'
import type { ShamarConfig } from '../config.js'
import type { ShamarHttpContext } from '../context.js'

export type RequireApiKeyHandler = (ctx: HttpContext, next: NextFn) => Promise<unknown>

/**
 * Build a route middleware that requires a valid **machine** API key
 * (`X-Api-Key` / `Api-Key`).
 *
 * Prefer this factory when registering from Shamar (config is already known).
 * The default class export resolves config from the IoC container for named use.
 */
export function createRequireApiKeyMiddleware(config: ShamarConfig): RequireApiKeyHandler {
  return async (ctx, next) => {
    const resolve = config.auth?.apiKeys?.resolve

    if (!resolve) {
      return ctx.response.status(500).json({
        message: 'API key authentication is not configured (auth.apiKeys.resolve).',
      })
    }

    const plainText = extractMachineApiKey({
      get: (name) => ctx.request.header(name) ?? undefined,
    })

    if (!plainText) {
      return ctx.response.status(401).json({
        message: 'Valid API key required. Pass it via the X-Api-Key header.',
      })
    }

    const principal = await resolve(plainText, ctx as ShamarHttpContext)
    if (!principal || !isMachineApiKeyPrincipal(principal)) {
      return ctx.response.status(401).json({
        message: 'Valid API key required. Pass it via the X-Api-Key header.',
      })
    }

    const shamarCtx = ctx as ShamarHttpContext & {
      shamarGatewayUser?: typeof principal
      shamarGatewayApiKeyId?: string
    }
    shamarCtx.shamarGatewayUser = principal
    shamarCtx.shamarGatewayApiKeyId = principal.apiKeyId

    return next()
  }
}

/**
 * Require a valid **machine** API key on the request (`X-Api-Key` or `Api-Key`).
 *
 * Opt in per route / group — does not run unless assigned:
 *
 * ```ts
 * // Via Shamar config (applies to /api/shamar):
 * auth: { apiKeys: { resolve, protectApi: true } }
 *
 * // Or on custom routes:
 * import { middleware } from '#start/kernel'
 * router.group(() => { … }).use(middleware.shamarApiKey())
 * ```
 */
export default class RequireApiKeyMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    // Prefer binding from container when registered as named middleware.
    const { default: app } = await import('@adonisjs/core/services/app')
    const config = (await app.container.make('shamar.config')) as ShamarConfig
    return createRequireApiKeyMiddleware(config)(ctx, next)
  }
}
