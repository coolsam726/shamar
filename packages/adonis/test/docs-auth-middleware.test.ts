import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createRequireDocsAuthMiddleware,
  docsRequestWantsJson,
} from '../src/middleware/docs_auth_middleware.js'
import type { ShamarConfig } from '../src/config.js'

type MockResponse = {
  statusCode?: number
  body?: unknown
  redirectTo?: string
  status: (code: number) => MockResponse
  json: (body: unknown) => unknown
  redirect: (url: string) => unknown
}

function createCtx(options: {
  url: string
  accept?: string
  apiKey?: string
  sessionUser?: Record<string, unknown> | null
  resolveUser?: (ctx: unknown) => unknown
}) {
  const response: MockResponse = {
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return body
    },
    redirect(url) {
      this.redirectTo = url
      return url
    },
  }

  const headers: Record<string, string | undefined> = {
    accept: options.accept,
    'x-api-key': options.apiKey,
  }

  const ctx = {
    request: {
      url: () => options.url,
      header: (name: string) => headers[name.toLowerCase()],
    },
    response,
    auth: {
      use() {
        return {
          check: async () => Boolean(options.sessionUser),
          user: options.sessionUser ?? undefined,
        }
      },
    },
  }

  return { ctx, response }
}

describe('docsRequestWantsJson', () => {
  it('treats openapi.json as JSON', () => {
    const { ctx } = createCtx({ url: '/api/shamar/openapi.json' })
    assert.equal(docsRequestWantsJson(ctx as never), true)
  })

  it('treats HTML docs as non-JSON by default', () => {
    const { ctx } = createCtx({ url: '/api/shamar/docs', accept: 'text/html' })
    assert.equal(docsRequestWantsJson(ctx as never), false)
  })

  it('treats Accept: application/json as JSON', () => {
    const { ctx } = createCtx({
      url: '/api/shamar/docs',
      accept: 'application/json',
    })
    assert.equal(docsRequestWantsJson(ctx as never), true)
  })
})

describe('createRequireDocsAuthMiddleware', () => {
  const baseConfig: ShamarConfig = {
    auth: {
      guard: 'web',
      loginPath: '/login',
      apiKeys: {
        resolve: async (plainText) => {
          if (plainText === 'good-key') {
            return {
              id: 'apikey:key-1',
              name: 'Gateway',
              apiKeyId: 'key-1',
              permissions: ['*'],
            }
          }
          return null
        },
      },
    },
  }

  it('allows an authenticated panel session without API key', async () => {
    const { ctx } = createCtx({
      url: '/api/shamar/docs',
      sessionUser: { id: 'u1', name: 'Admin', email: 'a@example.com' },
    })
    let called = false
    const mw = createRequireDocsAuthMiddleware(baseConfig)
    await mw(ctx as never, async () => {
      called = true
    })
    assert.equal(called, true)
  })

  it('allows a valid machine API key without session', async () => {
    const { ctx } = createCtx({
      url: '/api/shamar/openapi.json',
      apiKey: 'good-key',
    })
    let called = false
    const mw = createRequireDocsAuthMiddleware(baseConfig)
    await mw(ctx as never, async () => {
      called = true
    })
    assert.equal(called, true)
    assert.equal((ctx as { shamarGatewayApiKeyId?: string }).shamarGatewayApiKeyId, 'key-1')
  })

  it('redirects HTML docs to login when unauthenticated', async () => {
    const { ctx, response } = createCtx({
      url: '/api/shamar/docs',
      accept: 'text/html',
    })
    const mw = createRequireDocsAuthMiddleware(baseConfig)
    await mw(ctx as never, async () => {
      throw new Error('should not run')
    })
    assert.equal(response.redirectTo, '/login')
    assert.equal(response.statusCode, undefined)
  })

  it('returns 401 JSON for openapi.json when unauthenticated', async () => {
    const { ctx, response } = createCtx({
      url: '/api/shamar/openapi.json',
    })
    const mw = createRequireDocsAuthMiddleware(baseConfig)
    await mw(ctx as never, async () => {
      throw new Error('should not run')
    })
    assert.equal(response.statusCode, 401)
    assert.equal(response.redirectTo, undefined)
    assert.match(String((response.body as { message?: string })?.message), /API key|session/i)
  })

  it('rejects an invalid API key even when Accept is HTML (no session)', async () => {
    const { ctx, response } = createCtx({
      url: '/api/shamar/docs',
      accept: 'text/html',
      apiKey: 'bad-key',
    })
    const mw = createRequireDocsAuthMiddleware(baseConfig)
    await mw(ctx as never, async () => {
      throw new Error('should not run')
    })
    assert.equal(response.redirectTo, '/login')
  })

  it('uses auth.resolveUser when provided', async () => {
    const config: ShamarConfig = {
      auth: {
        loginPath: '/sign-in',
        resolveUser: async () => ({
          id: 'custom-1',
          name: 'Custom',
          permissions: ['*'],
        }),
      },
    }
    const { ctx } = createCtx({ url: '/api/shamar/docs' })
    let called = false
    const mw = createRequireDocsAuthMiddleware(config)
    await mw(ctx as never, async () => {
      called = true
    })
    assert.equal(called, true)
  })
})
