import type { GoogleFontOptions, PanelBranding } from '@shamar/core';

export interface ShamarBranding {
  brandName: string;
  logoUrl?: string;
  logoDarkUrl?: string;
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
  if (!override) return { ...base };
  return {
    ...base,
    ...Object.fromEntries(
      Object.entries(override).filter(([, value]) => value !== undefined && value !== ''),
    ),
  } as ShamarBranding;
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

export function buildBrandingCss(branding: ShamarBranding): string {
  const primary = normalizeHexColor(branding.primaryColor) ?? DEFAULT_SHAMAR_BRANDING.primaryColor;
  const accent = normalizeHexColor(branding.accentColor) ?? DEFAULT_SHAMAR_BRANDING.accentColor;
  const fontFamily = branding.fontFamily;

  return `/* Shamar admin branding — generated at runtime */
:root {
  --shamar-font-family: ${fontFamily};
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
  --color-brand-soft: color-mix(in srgb, ${primary} 20%, white);
  --color-brand-softer: color-mix(in srgb, ${primary} 20%, white);
  --color-default: color-mix(in srgb, ${primary} 35%, white);
  --color-neutral-secondary: color-mix(in srgb, ${primary} 10%, white);
  --color-neutral-tertiary: color-mix(in srgb, ${primary} 20%, white);
  --color-shamar-shell: color-mix(in srgb, color-mix(in srgb, ${primary} 10%, white) 35%, white);
  --color-shamar-accent: ${accent};
  accent-color: var(--color-fg-brand);
}

.dark {
  --color-fg-brand: ${primary};
  --color-fg-brand-strong: color-mix(in srgb, ${primary} 78%, white);
  --color-brand-soft: color-mix(in srgb, ${primary} 48%, black);
  --color-brand-softer: color-mix(in srgb, ${primary} 32%, black);
  --color-shamar-shell: var(--color-gray-800);
  --color-neutral-primary: var(--color-gray-900);
  --color-neutral-secondary: var(--color-gray-800);
  --color-neutral-tertiary: #151c28;
  --color-default: var(--color-gray-700);
  accent-color: var(--color-fg-brand);
}

body {
  font-family: var(--shamar-font-family);
  accent-color: var(--color-fg-brand);
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
