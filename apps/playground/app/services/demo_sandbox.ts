import type { ApplicationService } from '@adonisjs/core/types'
import env from '#start/env'

export const DEMO_INTERVAL_SECONDS = 20 * 60

/** A user is “active” if they hit the app within this window. */
export const DEMO_ACTIVE_IDLE_MS = 5 * 60 * 1000

/**
 * Soft ceiling: if every window is skipped for this long, wipe anyway so a
 * stuck tab cannot freeze the sandbox forever.
 */
export const DEMO_MAX_DEFER_MS = 60 * 60 * 1000

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
  /** True when the last due window was deferred because someone was active. */
  lastSkipReason?: 'active_users' | null
  activeUsers?: number
}

/** Public sandbox logins (password is always re-seeded). */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: 'admin@example.com', password: 'password', role: 'admin' },
  { email: 'viewer@example.com', password: 'password', role: 'viewer' },
]

let nextResetAt = Date.now() + DEMO_INTERVAL_SECONDS * 1000
let lastResetAt: string | null = null
let lastSkipReason: 'active_users' | null = null
let lastActiveUsers = 0
/** When the reset first became due while users were still active. */
let deferStartedAt: number | null = null
let resetInFlight: Promise<void> | null = null
let timer: ReturnType<typeof setInterval> | null = null

/** Throttle presence writes (ms). */
const PRESENCE_WRITE_MIN_MS = 30_000
const presenceWriteAt = new Map<string, number>()

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
    lastSkipReason,
    activeUsers: lastActiveUsers,
  }
}

export function bumpNextReset(from = Date.now()) {
  nextResetAt = from + DEMO_INTERVAL_SECONDS * 1000
}

/**
 * Touch `lastSeenAt` for an authenticated demo user (throttled).
 * Cookie sessions cannot be enumerated — this is the idle signal for reset gating.
 */
export async function touchDemoPresence(userId: string | number | null | undefined): Promise<void> {
  if (!isDemoMode() || userId == null) return
  const id = String(userId).trim()
  if (!id) return

  const now = Date.now()
  const last = presenceWriteAt.get(id) ?? 0
  if (now - last < PRESENCE_WRITE_MIN_MS) return
  presenceWriteAt.set(id, now)

  try {
    const User = (await import('#models/user')).default
    await User.updateOne({ _id: id }, { $set: { lastSeenAt: new Date(now) } })
  } catch {
    /* ignore presence write failures */
  }
}

export async function countActiveDemoUsers(idleMs = DEMO_ACTIVE_IDLE_MS): Promise<number> {
  const User = (await import('#models/user')).default
  return User.countDocuments({
    lastSeenAt: { $gte: new Date(Date.now() - idleMs) },
  })
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
    presenceWriteAt.clear()

    const { seedPlaygroundData } = await import('#providers/mongo_provider')
    await seedPlaygroundData(app)

    const { seedRbacCatalog } = await import('#providers/rbac_provider')
    await seedRbacCatalog(app)

    lastResetAt = new Date().toISOString()
    lastSkipReason = null
    lastActiveUsers = 0
    deferStartedAt = null
    bumpNextReset()
    logger.info('[demo] reseed complete; next reset at %s', new Date(nextResetAt).toISOString())
  })().finally(() => {
    resetInFlight = null
  })

  return resetInFlight
}

/**
 * Run a scheduled reset when due. Skips the window if any user was active recently,
 * unless deferral has exceeded {@link DEMO_MAX_DEFER_MS}.
 */
export async function maybeWipeAndReseed(app: ApplicationService): Promise<'wiped' | 'skipped' | 'idle'> {
  if (Date.now() < nextResetAt) return 'idle'

  const logger = await app.container.make('logger')
  const active = await countActiveDemoUsers()
  lastActiveUsers = active

  if (active > 0) {
    if (deferStartedAt == null) deferStartedAt = Date.now()
    const deferredFor = Date.now() - deferStartedAt
    if (deferredFor < DEMO_MAX_DEFER_MS) {
      lastSkipReason = 'active_users'
      bumpNextReset()
      logger.info(
        '[demo] skip reset; %d active user(s) — next window %s',
        active,
        new Date(nextResetAt).toISOString(),
      )
      return 'skipped'
    }
    logger.warn(
      '[demo] forcing reset after %ds with %d still active',
      Math.round(deferredFor / 1000),
      active,
    )
  }

  await wipeAndReseed(app)
  return 'wiped'
}

export function startDemoResetScheduler(app: ApplicationService) {
  if (!isDemoMode()) return
  if (timer) return

  bumpNextReset()
  const loggerPromise = app.container.make('logger')

  timer = setInterval(() => {
    void (async () => {
      try {
        await maybeWipeAndReseed(app)
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
