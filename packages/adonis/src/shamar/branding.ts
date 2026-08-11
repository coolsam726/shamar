import type { BrandDisplay, GoogleFontOptions, PanelBranding } from '@shamar/core';
import type { CherubimUser } from '@shamar/cherubim';

/**
 * Runtime branding overrides (e.g. global settings or per-company logos).
 * Merged over panel / config branding. Empty values are ignored.
 */
export type BrandingOverride = Pick<
  PanelBranding,
  | 'name'
  | 'logo'
  | 'logoDark'
  | 'logoHeight'
  | 'brandDisplay'
  | 'copyright'
  | 'primaryColor'
  | 'accentColor'
>;

export interface BrandingOverrideContext {
  panelId?: string;
  companyId?: string;
  user: CherubimUser | null;
}

export interface ShamarBranding {
  brandName: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  /** CSS length for logo height (e.g. `2rem`, `36px`). */
  logoHeight: string;
  /**
   * Configured display mode. Prefer {@link showLogo} / {@link showBrandName}
   * in views — those already apply logo fallbacks.
   */
  brandDisplay: BrandDisplay;
  /** Render the logo image when a URL is available. */
  showLogo: boolean;
  /** Render the brand name text. */
  showBrandName: boolean;
  copyrightText?: string;
  fontFamily: string;
  fontUrl?: string;
  /** True when `fontUrl` points at Google Fonts (enables preconnect hints). */
  fontPreconnect?: boolean;
  primaryColor: string;
  accentColor: string;
}

export const DEFAULT_SHAMAR_BRANDING: ShamarBranding = {
  brandName: 'Admin',
  logoHeight: '2rem',
  brandDisplay: 'both',
  showLogo: false,
  showBrandName: true,
  fontFamily: 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
  primaryColor: '#f1511b',
  accentColor: '#286291',
};

const DEFAULT_GOOGLE_WEIGHTS = [400, 500, 600, 700] as const;

/**
 * Build a Google Fonts CSS2 URL + CSS font-family stack from a family name or options.
 */
export function resolveGoogleFont(
  input: string | GoogleFontOptions,
): { fontFamily: string; fontUrl: string } {
  const opts: GoogleFontOptions = typeof input === 'string' ? { family: input } : input;
  const family = opts.family.trim();
  if (!family) {
    throw new Error('googleFont.family must be a non-empty string');
  }

  const weights = normalizeWeights(opts.weights ?? [...DEFAULT_GOOGLE_WEIGHTS]);
  const display = opts.display ?? 'swap';
  const familyParam = encodeURIComponent(family).replace(/%20/g, '+');

  let axis: string;
  if (opts.italic) {
    const pairs = [
      ...weights.map((w) => `0,${w}`),
      ...weights.map((w) => `1,${w}`),
    ].join(';');
    axis = `ital,wght@${pairs}`;
  } else {
    axis = `wght@${weights.join(';')}`;
  }

  const fontUrl =
    `https://fonts.googleapis.com/css2?family=${familyParam}:${axis}&display=${display}`;
  const fontFamily = `"${family.replace(/"/g, '')}", ${DEFAULT_SHAMAR_BRANDING.fontFamily}`;

  return { fontFamily, fontUrl };
}

function normalizeWeights(weights: number[]): number[] {
  const unique = [...new Set(weights.map((w) => Math.round(Number(w))).filter((w) => w > 0))];
  unique.sort((a, b) => a - b);
  return unique.length ? unique : [...DEFAULT_GOOGLE_WEIGHTS];
}

export function mergeBranding(
  base: ShamarBranding,
  override?: Partial<ShamarBranding>,
): ShamarBranding {
  if (!override) return withBrandVisibility({ ...base });
  const merged = {
    ...base,
    ...Object.fromEntries(
      Object.entries(override).filter(([, value]) => value !== undefined && value !== ''),
    ),
  } as ShamarBranding;
  return withBrandVisibility(merged);
}

/**
 * Deep-ish merge for panel branding over global branding.
 * Panel `{ name: 'Admin' }` keeps global colors/fonts instead of wiping them.
 */
export function mergePanelBranding(
  base?: PanelBranding,
  override?: PanelBranding,
): PanelBranding | undefined {
  if (!base && !override) return undefined;
  if (!override) return base;
  if (!base) return override;
  return {
    ...base,
    ...Object.fromEntries(
      Object.entries(override).filter(([, value]) => value !== undefined && value !== ''),
    ),
  };
}

export function resolveBranding(config?: PanelBranding): ShamarBranding {
  const google = config?.googleFont
    ? resolveGoogleFont(config.googleFont)
    : undefined;

  const fontUrl = config?.fontUrl || google?.fontUrl;
  const fontFamily = config?.fontFamily || google?.fontFamily;

  return mergeBranding(DEFAULT_SHAMAR_BRANDING, {
    brandName: config?.name,
    logoUrl: config?.logo,
    logoDarkUrl: config?.logoDark,
    ...(config?.logoHeight != null && config.logoHeight !== ''
      ? { logoHeight: normalizeLogoHeight(config.logoHeight) }
      : {}),
    brandDisplay: normalizeBrandDisplay(config?.brandDisplay),
    copyrightText: config?.copyright,
    fontFamily,
    fontUrl,
    fontPreconnect: Boolean(
      fontUrl &&
        (fontUrl.includes('fonts.googleapis.com') || fontUrl.includes('fonts.gstatic.com')),
    ),
    primaryColor: config?.primaryColor,
    accentColor: config?.accentColor,
  });
}

/** Map a {@link BrandingOverride} onto {@link ShamarBranding} fields. */
export function brandingOverrideToPartial(
  override?: BrandingOverride | null,
): Partial<ShamarBranding> {
  if (!override) return {};
  return {
    brandName: override.name,
    logoUrl: override.logo,
    logoDarkUrl: override.logoDark,
    ...(override.logoHeight != null && override.logoHeight !== ''
      ? { logoHeight: normalizeLogoHeight(override.logoHeight) }
      : {}),
    ...(override.brandDisplay
      ? { brandDisplay: normalizeBrandDisplay(override.brandDisplay) }
      : {}),
    copyrightText: override.copyright,
    primaryColor: override.primaryColor,
    accentColor: override.accentColor,
  };
}

function normalizeBrandDisplay(value?: BrandDisplay | string | null): BrandDisplay {
  if (value === 'logo' || value === 'name' || value === 'both') return value;
  return 'both';
}

function withBrandVisibility(branding: ShamarBranding): ShamarBranding {
  const brandDisplay = normalizeBrandDisplay(branding.brandDisplay);
  const hasLogo = Boolean(branding.logoUrl?.trim());
  let showLogo = false;
  let showBrandName = true;

  if (brandDisplay === 'name') {
    showLogo = false;
    showBrandName = true;
  } else if (brandDisplay === 'logo') {
    showLogo = hasLogo;
    // Fall back to name when logo-only is requested but no URL is set.
    showBrandName = !hasLogo;
  } else {
    showLogo = hasLogo;
    showBrandName = true;
  }

  return {
    ...branding,
    brandDisplay,
    showLogo,
    showBrandName,
  };
}

/**
 * Resolve panel/config branding, then merge optional runtime overrides
 * (global settings, company logos, etc.).
 */
export async function resolveEffectiveBranding(
  panelBranding: PanelBranding | undefined,
  resolveOverrides?: (
    ctx: BrandingOverrideContext,
  ) => BrandingOverride | null | undefined | Promise<BrandingOverride | null | undefined>,
  auth?: {
    panelId?: string;
    companyId?: string;
    user?: CherubimUser | null;
  },
): Promise<ShamarBranding> {
  const base = resolveBranding(panelBranding);
  if (!resolveOverrides) return base;
  const override = await resolveOverrides({
    panelId: auth?.panelId,
    companyId: auth?.companyId,
    user: auth?.user ?? null,
  });
  return mergeBranding(base, brandingOverrideToPartial(override));
}

/**
 * Normalize logo height to a CSS length.
 * Bare numbers become pixels (`40` → `40px`).
 */
export function normalizeLogoHeight(value?: number | string | null): string {
  if (value == null || value === '') return DEFAULT_SHAMAR_BRANDING.logoHeight;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return `${value}px`;
  }
  const raw = String(value).trim();
  if (!raw) return DEFAULT_SHAMAR_BRANDING.logoHeight;
  if (/^\d+(\.\d+)?$/.test(raw)) return `${raw}px`;
  return raw;
}

export function buildBrandingCss(branding: ShamarBranding): string {
  const primary = normalizeHexColor(branding.primaryColor) ?? DEFAULT_SHAMAR_BRANDING.primaryColor;
  const accent = normalizeHexColor(branding.accentColor) ?? DEFAULT_SHAMAR_BRANDING.accentColor;
  const fontFamily = branding.fontFamily;

  return `/* Shamar admin branding — generated at runtime */
:root {
  --shamar-font-family: ${fontFamily};
  --shamar-logo-height: ${branding.logoHeight};
  --color-primary-500: ${primary};
  --color-primary-50: color-mix(in srgb, ${primary} 10%, white);
  --color-primary-100: color-mix(in srgb, ${primary} 20%, white);
  --color-primary-200: color-mix(in srgb, ${primary} 35%, white);
  --color-primary-300: color-mix(in srgb, ${primary} 55%, white);
  --color-primary-400: color-mix(in srgb, ${primary} 78%, white);
  --color-primary-600: color-mix(in srgb, ${primary} 88%, black);
  --color-primary-700: color-mix(in srgb, ${primary} 75%, black);
  --color-primary-800: color-mix(in srgb, ${primary} 62%, black);
  --color-primary-900: color-mix(in srgb, ${primary} 48%, black);
  --color-primary-950: color-mix(in srgb, ${primary} 32%, black);
  --color-shamar-primary: ${primary};
  --color-fg-brand: ${primary};
  --color-fg-brand-strong: color-mix(in srgb, ${primary} 62%, black);
  --color-brand-soft: color-mix(in srgb, ${primary} 28%, white);
  --color-brand-softer: color-mix(in srgb, ${primary} 18%, white);
  --color-default: var(--color-gray-200);
  --color-neutral-secondary: var(--color-gray-50);
  --color-neutral-tertiary: var(--color-gray-100);
  --color-shamar-shell: color-mix(in srgb, color-mix(in srgb, ${primary} 16%, white) 60%, white);
  --color-shamar-accent: ${accent};
  --color-shamar-accent-50: color-mix(in srgb, ${accent} 12%, white);
  --color-shamar-accent-100: color-mix(in srgb, ${accent} 22%, white);
  --color-shamar-accent-600: ${accent};
  --color-shamar-accent-700: color-mix(in srgb, ${accent} 78%, black);
  --color-shamar-brand-panel: linear-gradient(135deg, ${primary} 0%, color-mix(in srgb, ${primary} 72%, ${accent}) 100%);
  --color-shamar-brand-panel-solid: ${primary};
  --color-shamar-brand-panel-fg: #ffffff;
  --color-shamar-brand-panel-muted: rgb(255 255 255 / 72%);
  --color-shamar-top-accent: ${primary};
  accent-color: var(--color-fg-brand);
}

.dark {
  --color-fg-brand: ${primary};
  --color-fg-brand-strong: color-mix(in srgb, ${primary} 78%, white);
  --color-brand-soft: color-mix(in srgb, ${primary} 42%, black);
  --color-brand-softer: color-mix(in srgb, ${primary} 28%, black);
  --color-shamar-shell: var(--color-gray-800);
  --color-neutral-primary: var(--color-gray-900);
  --color-neutral-secondary: var(--color-gray-800);
  --color-neutral-tertiary: #151c28;
  --color-default: var(--color-gray-700);
  --color-shamar-brand-panel: linear-gradient(135deg, color-mix(in srgb, ${primary} 82%, black) 0%, color-mix(in srgb, ${accent} 70%, black) 100%);
  --color-shamar-brand-panel-solid: color-mix(in srgb, ${primary} 78%, black);
  --color-shamar-brand-panel-fg: #ffffff;
  --color-shamar-brand-panel-muted: rgb(255 255 255 / 70%);
  --color-shamar-top-accent: ${primary};
  accent-color: var(--color-fg-brand);
}

body {
  font-family: var(--shamar-font-family);
  accent-color: var(--color-fg-brand);
}

h1, h2, h3, .shamar-brand-name, .text-heading {
  font-family: var(--shamar-font-family);
  letter-spacing: -0.015em;
}
`;
}

function normalizeHexColor(value: string): string | undefined {
  const trimmed = value.trim();
  const match = trimmed.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return undefined;
  const hex = match[1]!;
  if (hex.length === 3) {
    return `#${hex
      .split('')
      .map((char) => char + char)
      .join('')}`;
  }
  return `#${hex.toLowerCase()}`;
}
