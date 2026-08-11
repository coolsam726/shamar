/**
 * Built-in default list page size when panel/resource omit `defaultPerPage`.
 */
export const DEFAULT_LIST_PER_PAGE = 15;

/** Common row-count choices shown in the list toolbar. */
export const LIST_PER_PAGE_OPTIONS = [10, 15, 20, 25, 50] as const;

/**
 * Resolve effective default page size: resource → panel → built-in `15`.
 * Invalid / missing values fall through to the next level.
 */
export function resolveDefaultPerPage(
  resourceDefault?: number | null,
  panelDefault?: number | null,
): number {
  for (const candidate of [resourceDefault, panelDefault, DEFAULT_LIST_PER_PAGE]) {
    if (candidate == null) continue;
    const n = Math.round(Number(candidate));
    if (Number.isFinite(n) && n >= 1) return n;
  }
  return DEFAULT_LIST_PER_PAGE;
}

/**
 * Toolbar select options, ensuring the active default is always present.
 */
export function resolvePerPageOptions(defaultPerPage: number): number[] {
  const options = new Set<number>(LIST_PER_PAGE_OPTIONS);
  const n = Math.round(Number(defaultPerPage));
  if (Number.isFinite(n) && n >= 1) options.add(n);
  return [...options].sort((a, b) => a - b);
}
