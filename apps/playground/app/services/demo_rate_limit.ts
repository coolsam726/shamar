/**
 * Tiny in-memory sliding window limiter for the public demo.
 * Not a substitute for edge rate limits — enough to blunt login spam on one machine.
 */
type Bucket = { count: number; windowStartedAt: number }

const buckets = new Map<string, Bucket>()

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || now - existing.windowStartedAt >= windowMs) {
    buckets.set(key, { count: 1, windowStartedAt: now })
    return { ok: true }
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((existing.windowStartedAt + windowMs - now) / 1000),
    )
    return { ok: false, retryAfterSeconds }
  }

  existing.count += 1
  return { ok: true }
}

/** Best-effort client key for demo rate limits. */
export function clientRateKey(prefix: string, ip: string | undefined): string {
  return `${prefix}:${ip || 'unknown'}`
}
