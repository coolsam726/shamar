/**
 * Where panel navigation links sit in the chrome (Kona Firefly parity).
 *
 * - `app` — level 1 in the sidebar; levels 2–3 of the active level-1 item in the top bar
 * - `inverse` — inverse of `app`: level 1 in the top bar; children of the active root in the sidebar
 * - `side` — the full tree in the sidebar (groups are headings / accordion)
 * - `top` — the full tree in the top bar (no desktop sidebar column)
 *
 * Alias: `app_inverse` normalizes to `inverse`.
 */
export type NavigationType = 'app' | 'inverse' | 'side' | 'top';

/** Input accepted by {@link normalizeNavigationType}. */
export type NavigationTypeInput = NavigationType | 'app_inverse' | 'APP' | 'INVERSE' | 'APP_INVERSE' | 'SIDE' | 'TOP';

/**
 * How {@link NavigationType} `side` draws navigation groups.
 * `static` (default) keeps headings open. `accordion` collapses inactive groups.
 * APP, INVERSE, and TOP ignore this mode.
 */
export type SideNavMode = 'static' | 'accordion';

export type SideNavModeInput = SideNavMode | 'STATIC' | 'ACCORDION';

const NAV_ALIASES: Record<string, NavigationType> = {
  app: 'app',
  inverse: 'inverse',
  app_inverse: 'inverse',
  side: 'side',
  top: 'top',
};

export function normalizeNavigationType(
  value: NavigationTypeInput | string | undefined | null,
  fallback: NavigationType = 'app',
): NavigationType {
  if (value == null || !String(value).trim()) return fallback;
  const key = String(value).trim().toLowerCase();
  return NAV_ALIASES[key] ?? fallback;
}

export function normalizeSideNavMode(
  value: SideNavModeInput | string | undefined | null,
  fallback: SideNavMode = 'static',
): SideNavMode {
  if (value == null || !String(value).trim()) return fallback;
  const key = String(value).trim().toLowerCase();
  if (key === 'accordion') return 'accordion';
  if (key === 'static') return 'static';
  return fallback;
}
