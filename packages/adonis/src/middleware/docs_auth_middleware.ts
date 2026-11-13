import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import {
  extractMachineApiKey,
  isMachineApiKeyPrincipal,
} from '@shamar/cherubim'
import type { ShamarConfig } from '../config.js'
import type { ShamarHttpContext } from '../context.js'
import { resolveSessionUser, respondUnauthorized } from '../shamar/auth.js'

export type DocsAuthHandler = (ctx: HttpContext, next: NextFn) => Promise<unknown>

/**
 * Whether an unauthenticated docs request should get JSON 401 vs login redirect.
 *
 * - OpenAPI JSON path → always 401
 * - Explicit `Accept: application/json` (without HTML) → 401
 * - Browser HTML docs → redirect to `auth.loginPath`
 */
export function docsRequestWantsJson(ctx: HttpContext): boolean {
  const url = ctx.request.url()
  const path = url.split('?')[0] ?? url
  if (path.endsWith('/openapi.json') || path.endsWith('openapi.json')) {
    return true
  }

  const accept = (ctx.request.header('accept') ?? '').toLowerCase()
  if (accept.includes('application/json') && !accept.includes('text/html')) {
    return true
  }

  return false
}

/**
 * Dual auth for private OpenAPI docs: **panel session OR machine API key**.
 *
 * 1. Authenticated admin/panel session (same `auth.guard` / `resolveUser` as the panel)
 * 2. Else valid machine key via `X-Api-Key` / `Api-Key` (`auth.apiKeys.resolve`)
 *
 * Unauthenticated HTML → redirect to login; JSON/OpenAPI → 401.
 */
export function createRequireDocsAuthMiddleware(config: ShamarConfig): DocsAuthHandler {
  return async (ctx, next) => {
    const shamarCtx = ctx as ShamarHttpContext

    const sessionUser = await resolveSessionUser(shamarCtx, config)
    if (sessionUser) {
      return next()
    }

    const resolve = config.auth?.apiKeys?.resolve
    if (resolve) {
      const plainText = extractMachineApiKey({
        get: (name) => ctx.request.header(name) ?? undefined,
      })

      if (plainText) {
        const principal = await resolve(plainText, shamarCtx)
        if (principal && isMachineApiKeyPrincipal(principal)) {
          const keyed = ctx as ShamarHttpContext & {
            shamarGatewayUser?: typeof principal
            shamarGatewayApiKeyId?: string
          }
          keyed.shamarGatewayUser = principal
          keyed.shamarGatewayApiKeyId = principal.apiKeyId
          return next()
        }
      }
    }

    const asJson = docsRequestWantsJson(ctx)
    return respondUnauthorized(
      shamarCtx,
      config,
      asJson,
      asJson
        ? 'Valid API key or authenticated admin session required. Pass X-Api-Key, or sign in to the admin panel.'
        : 'Authentication required.',
    )
  }
}

/**
 * Dual auth for `/docs` + `/openapi.json` (session OR `X-Api-Key`).
 *
 * Prefer {@link createRequireDocsAuthMiddleware} when registering from Shamar.
 * The class export resolves config from the IoC container for named use.
 */
export default class RequireDocsAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { default: app } = await import('@adonisjs/core/services/app')
    const config = (await app.container.make('shamar.config')) as ShamarConfig
    return createRequireDocsAuthMiddleware(config)(ctx, next)
  }
}
