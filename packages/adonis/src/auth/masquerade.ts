import { timingSafeEqual } from 'node:crypto';

/** Session flag set after a successful masquerade login. */
export const MASQUERADE_SESSION_KEY = 'shamar_masquerade';

/**
 * True when a non-empty masquerade password is configured and
 * `NODE_ENV` is not `production`. Production never activates.
 */
export function isMasqueradeEnabled(
  config?: { auth?: { masquerade?: { password?: string } } } | null,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (String(env.NODE_ENV ?? '').toLowerCase() === 'production') return false;
  const password = config?.auth?.masquerade?.password;
  return typeof password === 'string' && password.trim() !== '';
}

/** Timing-safe string compare (false when lengths differ or either is empty). */
export function passwordsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(String(provided ?? ''), 'utf8');
  const b = Buffer.from(String(expected ?? ''), 'utf8');
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Whether the submitted password matches the configured masquerade
 * password while masquerade is enabled.
 */
export function isMasqueradePassword(
  provided: string,
  config?: { auth?: { masquerade?: { password?: string } } } | null,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!isMasqueradeEnabled(config, env)) return false;
  const expected = config?.auth?.masquerade?.password ?? '';
  return passwordsMatch(provided, expected);
}

/** Read the session flag set at masquerade login. */
export function isMasqueradeSession(session: {
  get?(key: string): unknown;
}): boolean {
  return session.get?.(MASQUERADE_SESSION_KEY) === true;
}
