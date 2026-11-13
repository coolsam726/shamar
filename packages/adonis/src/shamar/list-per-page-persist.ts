/**
 * Persist list "Rows" (perPage) like Filament/Kona tables:
 * query param wins when present; otherwise cookie (SSR) / localStorage (client).
 * Scoped per panel + resource (or list resource for page-section tables).
 */

export const LIST_PER_PAGE_COOKIE_PREFIX = 'shamar_pp_';
export const LIST_PER_PAGE_LOCAL_PREFIX = 'shamar-list-per-page:';
/** 1 year — preference should survive reloads and module switches. */
export const LIST_PER_PAGE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function cookieSafeSegment(value: string): string {
  return String(value || 'default')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 48);
}

/** localStorage key: `shamar-list-per-page:{panelId}:{slug}` */
export function listPerPageStorageKey(panelId: string, slug: string): string {
  return `${LIST_PER_PAGE_LOCAL_PREFIX}${panelId || 'default'}:${slug || 'list'}`;
}

/** Plain cookie name readable by both Adonis and browser JS. */
export function listPerPageCookieName(panelId: string, slug: string): string {
  return `${LIST_PER_PAGE_COOKIE_PREFIX}${cookieSafeSegment(panelId)}_${cookieSafeSegment(slug)}`;
}

/**
 * Normalize a stored / query perPage value to `all` or a numeric string.
 * Returns null when missing or invalid (caller falls through to default 15).
 */
export function parseStoredPerPage(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (s.toLowerCase() === 'all') return 'all';
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 5) return null;
  if (rounded >= 1000) return 'all';
  return String(rounded);
}

/**
 * Resolve effective perPage input: explicit query → cookie → undefined (built-in default).
 */
export function resolvePerPageFromQueryAndCookie(
  queryPerPage: unknown,
  cookieRaw: unknown,
): unknown {
  const fromQuery = parseStoredPerPage(queryPerPage);
  if (fromQuery != null) return fromQuery;
  // Preserve raw query when present but unparsable so normalizeListQuery can clamp it.
  if (queryPerPage !== undefined && queryPerPage !== null && String(queryPerPage).trim() !== '') {
    return queryPerPage;
  }
  return parseStoredPerPage(cookieRaw) ?? undefined;
}
