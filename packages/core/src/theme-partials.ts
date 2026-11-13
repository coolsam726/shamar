import type { ShamarTheme } from './theme.js';

/**
 * Chrome slots Firefly replaces via `FireflyTheme.partial(slot)`.
 * Shamar Edge shells swap `sidebar` / `topbar` / `footer`; `body` is for auth-style
 * documents (or custom layouts). Hook markers use Firefly's `ff-hook:` comments so
 * themes port verbatim; `shamar-hook:` is accepted as an alias.
 */
export const THEME_PARTIAL_SLOTS = ['sidebar', 'topbar', 'body', 'footer'] as const;
export type ThemePartialSlot = (typeof THEME_PARTIAL_SLOTS)[number];

export type ThemePartials = Partial<Record<ThemePartialSlot, string>>;

const SLOT_HOOKS: Record<ThemePartialSlot, string[]> = {
  sidebar: ['sidebar.start', 'sidebar.end'],
  topbar: ['topbar.start', 'topbar.end'],
  body: ['body.start', 'body.end'],
  footer: ['footer'],
};

/** Required HTML comments a replacement partial must contain (Firefly parity). */
export function requiredPartialMarkers(slot: ThemePartialSlot): string[] {
  return SLOT_HOOKS[slot].map((marker) => `<!-- ff-hook:${marker} -->`);
}

function hasMarker(html: string, marker: string): boolean {
  if (html.includes(marker)) return true;
  const shamar = marker.replace('ff-hook:', 'shamar-hook:');
  return html.includes(shamar);
}

/**
 * Replace hook markers with empty content (Shamar has no Panel.hook chrome fillers yet).
 * Accepts both `ff-hook` and `shamar-hook` spellings.
 */
export function fillThemePartialMarkers(html: string): string {
  return html
    .replace(/<!--\s*(?:ff|shamar)-hook:[^>]*-->/g, '')
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * Resolve theme HTML replacements for chrome slots.
 * Throws when a non-null partial is missing required hook markers.
 */
export function resolveThemePartials(theme: ShamarTheme): ThemePartials {
  const out: ThemePartials = {};
  for (const slot of THEME_PARTIAL_SLOTS) {
    const raw = theme.partial(slot);
    if (raw == null) continue;
    const missing = requiredPartialMarkers(slot).filter((marker) => !hasMarker(raw, marker));
    if (missing.length > 0) {
      throw new Error(
        `Theme [${theme.id()}] partial [${slot}] is missing markers ${missing.join(', ')}`,
      );
    }
    out[slot] = fillThemePartialMarkers(raw);
  }
  return out;
}
