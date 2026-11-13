/**
 * Content max-width tokens for panels, pages, and resources.
 *
 * Prefer the const for IDE autocomplete:
 * `panel('admin').maxContentWidth(MaxWidth.ScreenLg)`.
 *
 * Primary string API is Tailwind-aligned (`sm`, `md`, `lg`, `xl`, `7xl`,
 * `screen-sm`…`screen-2xl`, `container`, `prose`, bare `[1200px]`).
 * Filament short aliases (`s`/`m`/`l`, `screen-s`/`screen-m`/`screen-l`)
 * remain accepted for backward compatibility. Full Tailwind `max-w-*`
 * classes also remain accepted.
 */
export const MaxWidth = {
  ExtraSmall: 'xs',
  /** Tailwind `max-w-sm`. */
  Sm: 'sm',
  /** Alias of {@link MaxWidth.Sm}. */
  Small: 'sm',
  /** @deprecated Filament short token; prefer {@link MaxWidth.Sm} / `'sm'`. */
  S: 's',
  /** Tailwind `max-w-md`. */
  Md: 'md',
  /** Alias of {@link MaxWidth.Md}. */
  Medium: 'md',
  /** @deprecated Filament short token; prefer {@link MaxWidth.Md} / `'md'`. */
  M: 'm',
  /** Tailwind `max-w-lg`. */
  Lg: 'lg',
  /** Alias of {@link MaxWidth.Lg}. */
  Large: 'lg',
  /** @deprecated Filament short token; prefer {@link MaxWidth.Lg} / `'lg'`. */
  L: 'l',
  ExtraLarge: 'xl',
  TwoExtraLarge: '2xl',
  ThreeExtraLarge: '3xl',
  FourExtraLarge: '4xl',
  FiveExtraLarge: '5xl',
  SixExtraLarge: '6xl',
  SevenExtraLarge: '7xl',
  Full: 'full',
  None: 'none',
  Min: 'min',
  Max: 'max',
  Fit: 'fit',
  Prose: 'prose',
  Screen: 'screen',
  /** Tailwind `max-w-screen-sm`. */
  ScreenSm: 'screen-sm',
  /** Alias of {@link MaxWidth.ScreenSm}. */
  ScreenSmall: 'screen-sm',
  /** @deprecated Filament short alias; prefer {@link MaxWidth.ScreenSm} / `'screen-sm'`. */
  ScreenS: 'screen-s',
  /** Tailwind `max-w-screen-md`. */
  ScreenMd: 'screen-md',
  /** Alias of {@link MaxWidth.ScreenMd}. */
  ScreenMedium: 'screen-md',
  /** @deprecated Filament short alias; prefer {@link MaxWidth.ScreenMd} / `'screen-md'`. */
  ScreenM: 'screen-m',
  /** Tailwind `max-w-screen-lg`. */
  ScreenLg: 'screen-lg',
  /** Alias of {@link MaxWidth.ScreenLg}. */
  ScreenLarge: 'screen-lg',
  /** @deprecated Filament short alias; prefer {@link MaxWidth.ScreenLg} / `'screen-lg'`. */
  ScreenL: 'screen-l',
  ScreenXl: 'screen-xl',
  /** Alias of {@link MaxWidth.ScreenXl}. */
  ScreenExtraLarge: 'screen-xl',
  Screen2Xl: 'screen-2xl',
  /** Alias of {@link MaxWidth.Screen2Xl}. */
  ScreenTwoExtraLarge: 'screen-2xl',
  /** Tailwind `container` utility (breakpoint-capped width). */
  Container: 'container',
} as const;

export type MaxWidthToken = (typeof MaxWidth)[keyof typeof MaxWidth];

/**
 * Values accepted by {@link resolveContentMaxWidth} / panel `.maxContentWidth()`.
 * Known tokens keep autocomplete; any string is still allowed (CSS lengths, custom classes).
 */
export type MaxWidthInput =
  | MaxWidthToken
  | `max-w-${string}`
  | `[${string}]`
  | (string & {});

/**
 * @deprecated Prefer {@link MaxWidth} (`MaxWidth.ScreenLg`, `MaxWidth.Prose`, …).
 * Legacy SCREAMING_SNAKE keys remain for existing call sites.
 */
export const MaxContentWidth = {
  ...MaxWidth,
  XS: MaxWidth.ExtraSmall,
  SM: MaxWidth.Sm,
  MD: MaxWidth.Md,
  LG: MaxWidth.Lg,
  XL: MaxWidth.ExtraLarge,
  '2XL': MaxWidth.TwoExtraLarge,
  '3XL': MaxWidth.ThreeExtraLarge,
  '4XL': MaxWidth.FourExtraLarge,
  '5XL': MaxWidth.FiveExtraLarge,
  '6XL': MaxWidth.SixExtraLarge,
  '7XL': MaxWidth.SevenExtraLarge,
  FULL: MaxWidth.Full,
  NONE: MaxWidth.None,
  MIN: MaxWidth.Min,
  MAX: MaxWidth.Max,
  FIT: MaxWidth.Fit,
  PROSE: MaxWidth.Prose,
  SCREEN: MaxWidth.Screen,
  SCREEN_SM: MaxWidth.ScreenSm,
  SCREEN_MD: MaxWidth.ScreenMd,
  SCREEN_LG: MaxWidth.ScreenLg,
  SCREEN_XL: MaxWidth.ScreenXl,
  SCREEN_2XL: MaxWidth.Screen2Xl,
  SCREEN_S: MaxWidth.ScreenS,
  SCREEN_M: MaxWidth.ScreenM,
  SCREEN_L: MaxWidth.ScreenL,
  CONTAINER: MaxWidth.Container,
} as const;

/** @deprecated Prefer {@link MaxWidthToken}. */
export type MaxContentWidthToken = MaxWidthToken | (typeof MaxContentWidth)[keyof typeof MaxContentWidth];

/** @deprecated Prefer {@link MaxWidthInput}. */
export type MaxContentWidthInput = MaxWidthInput;

/** Known Tailwind `max-w-*` tokens we emit as classes (safe for CSS purge). */
const TAILWIND_TOKENS = new Set<string>([
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  'full',
  'none',
  'min',
  'max',
  'fit',
  'prose',
  'screen',
  'screen-sm',
  'screen-md',
  'screen-lg',
  'screen-xl',
  'screen-2xl',
  'container',
]);

/**
 * Canonical CSS `max-width` for known tokens.
 * Emitted as an inline style so width constraints apply even if a Tailwind
 * utility is missing from the compiled stylesheet (purge / link timing).
 */
const TOKEN_MAX_WIDTH_CSS: Readonly<Record<string, string>> = {
  xs: '20rem',
  sm: '24rem',
  md: '28rem',
  lg: '32rem',
  xl: '36rem',
  '2xl': '42rem',
  '3xl': '48rem',
  '4xl': '56rem',
  '5xl': '64rem',
  '6xl': '72rem',
  '7xl': '80rem',
  full: '100%',
  none: 'none',
  min: 'min-content',
  max: 'max-content',
  fit: 'fit-content',
  prose: '65ch',
  screen: '100vw',
  'screen-sm': '40rem',
  'screen-md': '48rem',
  'screen-lg': '64rem',
  'screen-xl': '80rem',
  'screen-2xl': '96rem',
};

/**
 * Filament-style / short aliases → canonical Tailwind tokens.
 * Primary API is already Tailwind-aligned (`sm`, `screen-md`, …);
 * these expand optional BC short forms only.
 */
export const MAX_CONTENT_WIDTH_ALIASES: Readonly<Record<string, string>> = {
  s: 'sm',
  m: 'md',
  l: 'lg',
  'screen-s': 'screen-sm',
  'screen-m': 'screen-md',
  'screen-l': 'screen-lg',
};

/**
 * Default max width for form and show pages when panel/resource omit `contentMaxWidth`.
 * Screen tokens map to breakpoint widths (container-like).
 */
export const DEFAULT_CONTENT_MAX_WIDTH = 'screen-xl';

export interface ContentMaxWidthResolved {
  /** Tailwind class such as `w-full max-w-screen-xl`, `w-full container`, or `max-w-none`. */
  className: string;
  /** Inline `max-width: …` when a CSS length / arbitrary value / known token was provided. */
  style?: string;
}

function classForToken(token: string): string {
  if (token === 'container') return 'w-full container';
  if (token === 'none') return 'w-full max-w-none';
  if (token === 'full') return 'w-full max-w-full';
  // Screen / scale tokens: fill the content column up to the cap.
  return `w-full max-w-${token}`;
}

function resolvedForToken(token: string): ContentMaxWidthResolved {
  const className = classForToken(token);
  const css = TOKEN_MAX_WIDTH_CSS[token];
  if (css) return { className, style: `max-width: ${css}` };
  return { className };
}

/**
 * Normalize Filament short aliases (`s`, `screen-l`, …) to canonical Tailwind
 * tokens (`sm`, `screen-lg`, …). Full `max-w-*` classes, bare `[…]` arbitrary
 * values, CSS lengths, and already-canonical tokens are returned unchanged.
 */
export function normalizeMaxContentWidth(value?: string | null): string {
  const raw = (value ?? '').trim();
  if (!raw) return DEFAULT_CONTENT_MAX_WIDTH;
  const aliased = MAX_CONTENT_WIDTH_ALIASES[raw];
  if (aliased) return aliased;
  return raw;
}

/** Alias of {@link normalizeMaxContentWidth}. */
export const normalizeMaxWidth = normalizeMaxContentWidth;

/**
 * Resolve panel/resource `contentMaxWidth` / `maxContentWidth` for form + show layouts.
 *
 * Accepts:
 * - Tailwind scale tokens: `sm`, `md`, `lg`, `xs`…`7xl`, `full`, `none`, `min`, `max`, `fit`
 * - Screen tokens: `screen-sm`, `screen-md`, `screen-lg`, `screen-xl`, `screen-2xl`, `screen`
 * - Filament BC aliases: `s`/`m`/`l`, `screen-s`/`screen-m`/`screen-l`, `container`, `prose`
 * - Bare arbitrary: `[800px]`, `[1200px]`, `[80rem]`
 * - Full Tailwind class (BC): `max-w-screen-xl`, `max-w-7xl`, `max-w-[80rem]`
 * - CSS length: `80rem`, `1200px`, `90%`
 *
 * Known tokens also emit an inline `max-width` so the cap applies even when the
 * matching Tailwind utility is absent from compiled CSS.
 *
 * Default: `screen-xl` (1280px). Override per panel with `.maxContentWidth(MaxWidth.Screen2Xl)`
 * (or `.contentMaxWidth('…')`) or per resource with `static contentMaxWidth = '…'`.
 */
export function resolveContentMaxWidth(value?: string | null): ContentMaxWidthResolved {
  const raw = (value ?? DEFAULT_CONTENT_MAX_WIDTH).trim();
  if (!raw) return resolvedForToken(DEFAULT_CONTENT_MAX_WIDTH);

  // Bare arbitrary: [80rem] / [1200px] → inline style (purge-safe).
  const bareArbitrary = /^\[(.+)\]$/.exec(raw);
  if (bareArbitrary) {
    return { className: 'w-full max-w-none', style: `max-width: ${bareArbitrary[1]}` };
  }

  // Tailwind arbitrary: max-w-[80rem] / max-w-[1200px] → inline style (purge-safe).
  const arbitrary = /^max-w-\[(.+)\]$/.exec(raw);
  if (arbitrary) {
    return { className: 'w-full max-w-none', style: `max-width: ${arbitrary[1]}` };
  }

  if (raw.startsWith('max-w-')) {
    const token = raw.slice('max-w-'.length);
    const className = raw.includes('w-full') ? raw : `w-full ${raw}`;
    const css = TOKEN_MAX_WIDTH_CSS[token];
    if (css) return { className, style: `max-width: ${css}` };
    return { className };
  }

  const token = normalizeMaxContentWidth(raw);
  if (TAILWIND_TOKENS.has(token)) {
    return resolvedForToken(token);
  }

  return { className: 'w-full max-w-none', style: `max-width: ${raw}` };
}

/** Alias of {@link resolveContentMaxWidth}. */
export const resolveMaxWidth = resolveContentMaxWidth;
