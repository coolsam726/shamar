import { createHash } from 'node:crypto'

/**
 * HMAC secret for panel Wire islands (global search, notifications, …).
 * Must be identical for mount and update even if the package is loaded twice
 * (HMR / dual resolution). Prefer APP_KEY when present on `process.env`.
 */
export function panelWireSecret(): string {
  const configured = process.env.APP_KEY?.trim()
  const material = configured
    ? `shamar-panel-wire:${configured}`
    : 'shamar-panel-wire:default'
  return createHash('sha256').update(material).digest('hex')
}
