import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import env from '#start/env'
import {
  demoDocsOrigins,
  getDemoStatus,
  isDemoMode,
  wipeAndReseed,
} from '#services/demo_sandbox'

function applyDemoCors(response: HttpContext['response'], originHeader: string | undefined) {
  const allowed = demoDocsOrigins()
  const origin = originHeader || ''
  if (origin && allowed.includes(origin)) {
    response.header('Access-Control-Allow-Origin', origin)
    response.header('Vary', 'Origin')
  } else if (allowed.includes('*')) {
    response.header('Access-Control-Allow-Origin', '*')
  }
  response.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Demo-Reset-Token')
}

export default class DemoSandboxController {
  /**
   * Public status for docs countdown + credentials.
   */
  async status({ request, response }: HttpContext) {
    applyDemoCors(response, request.header('origin'))
    return response.json(getDemoStatus())
  }

  async statusOptions({ request, response }: HttpContext) {
    applyDemoCors(response, request.header('origin'))
    return response.status(204).send('')
  }

  /**
   * Manual wipe — requires DEMO_RESET_TOKEN (header or body).
   */
  async reset({ request, response }: HttpContext) {
    applyDemoCors(response, request.header('origin'))

    if (!isDemoMode()) {
      return response.status(404).json({ message: 'Demo mode is not enabled' })
    }

    const expected = env.get('DEMO_RESET_TOKEN')
    if (!expected) {
      return response.status(503).json({ message: 'DEMO_RESET_TOKEN is not configured' })
    }

    const provided =
      request.header('x-demo-reset-token') ||
      request.input('token') ||
      request.header('authorization')?.replace(/^Bearer\s+/i, '')

    if (!provided || provided !== expected) {
      return response.status(401).json({ message: 'Invalid reset token' })
    }

    const { clientRateKey, consumeRateLimit } = await import('#services/demo_rate_limit')
    const limited = consumeRateLimit(clientRateKey('reset', request.ip()), 6, 60_000)
    if (!limited.ok) {
      return response.status(429).json({
        message: 'Too many reset attempts',
        retryAfterSeconds: limited.retryAfterSeconds,
      })
    }

    await wipeAndReseed(app)
    return response.json({ ok: true, status: getDemoStatus() })
  }
}
