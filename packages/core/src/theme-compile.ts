/**
 * Ahead-of-time / browser-runtime Tailwind theme CSS helpers
 * (Kona `Theme.kt` brand scales + `themeCompileSource` / `finishCompiledCss`).
 */

/** Status colors the chrome already paints. Defaults until branding overrides. */
const SEMANTIC_COLOR_DEFAULTS: Array<[string, string]> = [
  ['--ff-success', '#16a34a'],
  ['--ff-warning', '#d97706'],
  ['--ff-danger', '#dc2626'],
  ['--ff-info', '#2563eb'],
];

/** Each scale's 500 step is this variable. */
const BRAND_COLOR_SCALES: Array<[string, string]> = [
  ['primary', '--ff-primary'],
  ['accent', '--ff-accent'],
  ['success', '--ff-success'],
  ['warning', '--ff-warning'],
  ['danger', '--ff-danger'],
  ['info', '--ff-info'],
  ['gray', '--ff-body-subtle'],
];

/** Unsuffixed utilities (`bg-primary`, `text-danger`) for variables that already exist. */
const THEME_COLOR_TOKENS: Array<[string, string]> = [
  ['primary', '--ff-primary'],
  ['accent', '--ff-accent'],
  ['heading', '--ff-heading'],
  ['surface', '--ff-surface'],
  ['success', '--ff-success'],
  ['warning', '--ff-warning'],
  ['danger', '--ff-danger'],
  ['info', '--ff-info'],
  ['gray', '--ff-body-subtle'],
];

/**
 * Brand-color share in each step. 500 is the brand variable itself.
 * Lower steps mix toward white. Higher steps mix toward black.
 */
const BRAND_SHADES: Array<[number, number]> = [
  [50, 8],
  [100, 18],
  [200, 34],
  [300, 52],
  [400, 74],
  [500, 100],
  [600, 84],
  [700, 68],
  [800, 50],
  [900, 32],
];

function brandShadeValue(source: string, step: number, percent: number): string {
  if (step === 500) return `var(${source})`;
  const toward = step < 500 ? 'white' : 'black';
  return `color-mix(in srgb, var(${source}) ${percent}%, ${toward})`;
}

/**
 * Shade custom properties on `.shamar-panel` / `.shamar-auth` (and `.ff-*` hosts).
 * A later branding rule can replace one step.
 */
export function brandColorScaleCss(): string {
  const lines: string[] = [
    '.shamar-panel,',
    '.shamar-auth,',
    '.ff-panel,',
    '.ff-auth {',
    '  --ff-body-subtle: var(--color-body-subtle, #64748b);',
    '  --shamar-body-subtle: var(--ff-body-subtle);',
  ];
  for (const [variable, hex] of SEMANTIC_COLOR_DEFAULTS) {
    lines.push(`  ${variable}: ${hex};`);
    lines.push(`  ${variable.replace('--ff-', '--shamar-')}: var(${variable});`);
  }
  for (const [name, source] of BRAND_COLOR_SCALES) {
    for (const [step, percent] of BRAND_SHADES) {
      lines.push(`  --ff-${name}-${step}: ${brandShadeValue(source, step, percent)};`);
      lines.push(`  --shamar-${name}-${step}: var(--ff-${name}-${step});`);
    }
  }
  lines.push('}');
  return lines.join('\n');
}

/**
 * `@theme inline` so utilities use `var(--ff-…)` on the element.
 * A `:root` copy would freeze the brand color before `.shamar-panel` sets it.
 */
export function brandColorThemeCss(): string {
  const lines: string[] = ['@theme inline {'];
  for (const [name, source] of THEME_COLOR_TOKENS) {
    lines.push(`  --color-${name}: var(${source});`);
  }
  for (const [name] of BRAND_COLOR_SCALES) {
    for (const [step] of BRAND_SHADES) {
      lines.push(`  --color-${name}-${step}: var(--ff-${name}-${step});`);
    }
  }
  lines.push('}');
  return lines.join('\n');
}

/**
 * `@import` plus `@theme inline` so `@apply` of panel scales becomes `var(--ff-*)`.
 * `sources` are Tailwind `@source` globs for panel theme classes.
 */
export function themeCompileSource(userCss: string, sources: string[] = []): string {
  const parts = [
    '@import "tailwindcss/theme";',
    '@import "tailwindcss/utilities";',
  ];
  for (const source of sources) {
    parts.push(`@source "${source}";`);
  }
  parts.push(brandColorThemeCss());
  parts.push(userCss.endsWith('\n') ? userCss : `${userCss}\n`);
  return parts.join('\n');
}

/** Scale custom properties in front of the expanded sheet, so the public file stands alone. */
export function finishCompiledCss(expanded: string): string {
  return `${brandColorScaleCss().trimEnd()}\n${expanded.trimStart()}`;
}

/** Escape attribute values for theme head tags. */
export function escapeThemeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Drops characters that would close the hold style. */
export function holdColor(value: string): string {
  return value.replace(/</g, '').replace(/>/g, '');
}
