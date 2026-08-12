import type { ApplicationService } from '@adonisjs/core/types'
import env from '#start/env'

export const DEMO_INTERVAL_SECONDS = 20 * 60

export type DemoAccount = {
  email: string
  password: string
  role: string
}

export type DemoStatus = {
  demoMode: boolean
  nextResetAt: string
  intervalSeconds: number
  accounts: DemoAccount[]
  lastResetAt: string | null
}

/** Public sandbox logins (password is always re-seeded). */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: 'admin@example.com', password: 'password', role: 'admin' },
  { email: 'viewer@example.com', password: 'password', role: 'viewer' },
]

let nextResetAt = Date.now() + DEMO_INTERVAL_SECONDS * 1000
let lastResetAt: string | null = null
let resetInFlight: Promise<void> | null = null
let timer: ReturnType<typeof setInterval> | null = null

export function isDemoMode(): boolean {
  return Boolean(env.get('SHAMAR_DEMO_MODE'))
}

export function getDemoStatus(): DemoStatus {
  return {
    demoMode: isDemoMode(),
    nextResetAt: new Date(nextResetAt).toISOString(),
    intervalSeconds: DEMO_INTERVAL_SECONDS,
    accounts: DEMO_ACCOUNTS,
    lastResetAt,
  }
}

export function bumpNextReset(from = Date.now()) {
  nextResetAt = from + DEMO_INTERVAL_SECONDS * 1000
}

/**
 * Drop the Mongo database and re-seed playground data + RBAC.
 * Safe to call concurrently — overlapping calls share one promise.
 */
export async function wipeAndReseed(app: ApplicationService): Promise<void> {
  if (resetInFlight) return resetInFlight

  resetInFlight = (async () => {
    const logger = await app.container.make('logger')
    logger.info('[demo] wiping database and reseeding…')

    const mongoose = (await import('mongoose')).default
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Mongo is not connected')
    }
    await mongoose.connection.dropDatabase()

    const { seedPlaygroundData } = await import('#providers/mongo_provider')
    await seedPlaygroundData(app)

    const { seedRbacCatalog } = await import('#providers/rbac_provider')
    await seedRbacCatalog(app)

    lastResetAt = new Date().toISOString()
    bumpNextReset()
    logger.info('[demo] reseed complete; next reset at %s', new Date(nextResetAt).toISOString())
  })().finally(() => {
    resetInFlight = null
  })

  return resetInFlight
}

export function startDemoResetScheduler(app: ApplicationService) {
  if (!isDemoMode()) return
  if (timer) return

  bumpNextReset()
  const loggerPromise = app.container.make('logger')

  timer = setInterval(() => {
    void (async () => {
      try {
        if (Date.now() < nextResetAt) return
        await wipeAndReseed(app)
      } catch (error) {
        const logger = await loggerPromise
        logger.error({ err: error }, '[demo] scheduled reset failed')
        bumpNextReset()
      }
    })()
  }, 5_000)

  // Unref so the timer does not keep the process alive alone in tests.
  timer.unref?.()
}

export function stopDemoResetScheduler() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

export function demoDocsOrigins(): string[] {
  const raw = env.get('DEMO_DOCS_ORIGIN') ?? 'http://localhost:4321'
  return String(raw)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}
