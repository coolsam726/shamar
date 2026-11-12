/**
 * Where panel navigation links sit in the chrome (Kona Firefly parity).
 *
 * Use the const object for IDE autocomplete:
 * `panel().navigationType(NavigationType.APP)`.
 *
 * String literals (`'app' | 'inverse' | 'side' | 'top'`) remain accepted for BC.
 *
 * - `app` — level 1 in the sidebar; levels 2–3 of the active level-1 item in the top bar
 * - `inverse` — inverse of `app`: level 1 in the top bar; children of the active root in the sidebar
 * - `side` — the full tree in the sidebar (groups are headings / accordion)
 * - `top` — the full tree in the top bar (no desktop sidebar column)
 *
 * Alias: `app_inverse` / {@link NavigationType.APP_INVERSE} normalizes to `inverse`.
 * Alias: `sidebar` / {@link NavigationType.SIDEBAR} normalizes to `side`.
 *
 * Mobile viewports always use a sidebar drawer with accordion groups, regardless of this value.
 */
export const NavigationType = {
  APP: 'app',
  /** Same layout as {@link NavigationType.INVERSE}; Firefly-style alias. */
  APP_INVERSE: 'inverse',
  INVERSE: 'inverse',
  SIDE: 'side',
  /** Alias of {@link NavigationType.SIDE}. */
  SIDEBAR: 'side',
  TOP: 'top',
} as const;

export type NavigationType = (typeof NavigationType)[keyof typeof NavigationType];

/** Input accepted by {@link normalizeNavigationType}. */
export type NavigationTypeInput =
  | NavigationType
  | 'app_inverse'
  | 'sidebar'
  | 'APP'
  | 'INVERSE'
  | 'APP_INVERSE'
  | 'SIDE'
  | 'SIDEBAR'
  | 'TOP';

/**
 * How {@link NavigationType} `side` draws navigation groups on desktop.
 * `static` (default) keeps headings open. `accordion` collapses inactive groups.
 * APP, INVERSE, and TOP ignore this mode on desktop. Mobile always uses accordion.
 */
export type SideNavMode = 'static' | 'accordion';

export type SideNavModeInput = SideNavMode | 'STATIC' | 'ACCORDION';

const NAV_ALIASES: Record<string, NavigationType> = {
  app: NavigationType.APP,
  inverse: NavigationType.INVERSE,
  app_inverse: NavigationType.INVERSE,
  side: NavigationType.SIDE,
  sidebar: NavigationType.SIDE,
  top: NavigationType.TOP,
};

export function normalizeNavigationType(
  value: NavigationTypeInput | string | undefined | null,
  fallback: NavigationType = NavigationType.APP,
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
