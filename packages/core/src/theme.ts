/**
 * Firefly-parity panel chrome themes (Kona `FireflyTheme` / `ThemeTokens`).
 *
 * Register one theme on the panel with `panel('admin').theme(new HarborTheme())`.
 * Hooks return extra CSS classes appended onto chrome the shell already draws.
 * Empty hooks leave the stock look. Layout is not replaced.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Palette + chrome size tokens (Kona `ThemeTokens`). */
export interface ThemeTokens {
  primary: string;
  accent: string;
  surface: string;
  heading: string;
  font: string;
  radius: string;
  sidebarWidth: string;
  topbarHeight: string;
  bodyBackground: string;
  /**
   * Dark primary fallback when the panel set no primary.
   * Does not replace a primary the panel set (that derives via {@link deriveDarkColor}).
   */
  darkPrimary: string;
  darkSurface: string;
  darkHeading: string;
}

/** Uncompiled stylesheet under `resources/css` → public `/css/...` (Kona `ThemeAssets`). */
export const THEME_ASSET_PREFIX = 'shamar-asset:';

/** Marker in `resources/css/*.css` that `node ace theme:css` compiles (Firefly `firefly-theme`). */
export const THEME_CSS_MARKER = 'shamar-theme';

/** Ace / grind command name for ahead-of-time `@apply` compile. */
export const THEME_CSS_COMMAND = 'node ace theme:css';

/**
 * Tailwind browser runtime from the CDN (same package/version as Firefly / local
 * `{basePath}/assets/tailwind.js`). Used only when a `themeAsset()` compile is
 * missing and `NODE_ENV` is not `production`.
 */
export const TAILWIND_CDN_SCRIPT =
  'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.5/dist/index.global.js';

let themeAssetsRootPath = '';

/** App root that contains `public/` and `resources/` (Kona `ThemeAssets.root`). */
export function setThemeAssetsRoot(root: string): void {
  themeAssetsRootPath = root;
}

export function getThemeAssetsRoot(): string {
  return themeAssetsRootPath || process.cwd();
}

export function themeAsset(path: string): string {
  return THEME_ASSET_PREFIX + normalizeThemeAssetPath(path);
}

export function isThemeAsset(stylesheet: string | null | undefined): boolean {
  if (stylesheet == null) return false;
  return stylesheet.trim().startsWith(THEME_ASSET_PREFIX);
}

export function themeAssetPublicUrl(stylesheet: string): string {
  return `/${normalizeThemeAssetPath(stylesheet)}`;
}

export function normalizeThemeAssetPath(path: string): string {
  let value = path.trim();
  if (value.startsWith(THEME_ASSET_PREFIX)) {
    value = value.slice(THEME_ASSET_PREFIX.length).trim();
  }
  value = value.replace(/^\/+/, '');
  if (value.startsWith('resources/css/')) {
    value = value.slice('resources/'.length);
  }
  if (value.startsWith('src/main/resources/')) {
    value = value.slice('src/main/resources/'.length).replace(/^\/+/, '');
  }
  if (
    value.length === 0 ||
    value.includes('..') ||
    value.includes('\\') ||
    value.includes('://')
  ) {
    throw new Error(`Theme asset [${path}] is not a stylesheet path under resources`);
  }
  return value;
}

/** Absolute path to the compiled public file for an asset token. */
export function themeAssetCompiledPath(stylesheet: string, root = getThemeAssetsRoot()): string {
  return join(root, 'public', normalizeThemeAssetPath(stylesheet));
}

/** Absolute path to the uncompiled resources file for an asset token. */
export function themeAssetSourcePath(stylesheet: string, root = getThemeAssetsRoot()): string {
  return join(root, 'resources', normalizeThemeAssetPath(stylesheet));
}

/** True when `public/` already has the compiled file for an asset token. */
export function hasCompiledThemeFile(stylesheet: string, root = getThemeAssetsRoot()): boolean {
  return existsSync(themeAssetCompiledPath(stylesheet, root));
}

/**
 * Uncompiled source for an asset token (`resources/css/foo.css`).
 * Empty when that file is absent (Kona `ThemeAssets.uncompiledCss`).
 */
export function readUncompiledThemeCss(
  stylesheet: string,
  root = getThemeAssetsRoot(),
): string {
  const file = themeAssetSourcePath(stylesheet, root);
  if (!existsSync(file)) return '';
  return readFileSync(file, 'utf8');
}

/** True when missing compiled CSS may fall back to the browser/CDN runtime. */
export function isThemeCssDevFallbackAllowed(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return String(env.NODE_ENV ?? 'development').toLowerCase() !== 'production';
}

/**
 * Production guard for `themeAsset()` themes: the compiled `public/` file must
 * exist. Development may omit it and use the CDN / browser runtime instead.
 * Explicit {@link ShamarTheme.useTailwind} opts into the local runtime in any env.
 */
export function assertCompiledThemeOrDevFallback(
  theme: { useTailwind(): boolean; stylesheet(): string | null; id(): string },
  root = getThemeAssetsRoot(),
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): void {
  if (theme.useTailwind()) return;
  const raw = theme.stylesheet()?.trim() ?? '';
  if (!isThemeAsset(raw) || hasCompiledThemeFile(raw, root)) return;
  if (isThemeCssDevFallbackAllowed(env)) return;
  const href = themeAssetPublicUrl(raw);
  throw new Error(
    `Theme [${theme.id()}] stylesheet ${href} is not compiled. ` +
      `Run \`${THEME_CSS_COMMAND}\` (writes public${href}) before production. ` +
      `CDN Tailwind fallback is development-only.`,
  );
}

/**
 * True when the page should load the Tailwind browser runtime and stay hidden
 * until that compile is in the CSSOM (Kona `themeUsesRuntime`).
 *
 * - {@link ShamarTheme.useTailwind} → always (local `{basePath}/assets/tailwind.js`)
 * - Missing `themeAsset()` compile → only when {@link isThemeCssDevFallbackAllowed}
 *   (CDN script in the head)
 */
export function themeUsesRuntime(
  theme: { useTailwind(): boolean; stylesheet(): string | null },
  root = getThemeAssetsRoot(),
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  if (theme.useTailwind()) return true;
  const raw = theme.stylesheet()?.trim() ?? '';
  if (!isThemeAsset(raw) || hasCompiledThemeFile(raw, root)) return false;
  return isThemeCssDevFallbackAllowed(env);
}

/** How the theme head should load Tailwind utilities. */
export type ThemeTailwindSource = 'none' | 'compiled' | 'local' | 'cdn';

/**
 * Prefer compiled `public/` CSS; otherwise local runtime (`useTailwind`) or CDN
 * (missing asset, development only).
 */
export function resolveThemeTailwindSource(
  theme: { useTailwind(): boolean; stylesheet(): string | null },
  root = getThemeAssetsRoot(),
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): ThemeTailwindSource {
  const raw = theme.stylesheet()?.trim() ?? '';
  const asset = isThemeAsset(raw);
  const compiled = asset && hasCompiledThemeFile(raw, root);
  if (compiled && !theme.useTailwind()) return 'compiled';
  if (theme.useTailwind()) return 'local';
  if (asset && !compiled && isThemeCssDevFallbackAllowed(env)) return 'cdn';
  if (asset && compiled) return 'compiled';
  return 'none';
}

/**
 * Panel chrome theme. Subclass and override hooks to append CSS classes.
 * Mirrors Kona `org.konaframework.firefly.support.FireflyTheme`.
 */
export class ShamarTheme {
  /** Short name used in theme error messages. {@link DefaultTheme} returns `shamar`. */
  id(): string {
    return 'custom';
  }

  /** Color, type, and size tokens. Default is the shipped Shamar palette. */
  tokens(): ThemeTokens {
    return new DefaultTheme().tokens();
  }

  /**
   * Explicit dark primary, or null to follow the panel.
   * Null derives a shade of the panel primary when the panel set one.
   * When the panel set no primary, dark mode uses {@link ThemeTokens.darkPrimary}.
   */
  darkPrimary(): string | null {
    return null;
  }

  /** Explicit dark accent, or null to follow / keep the light accent. */
  darkAccent(): string | null {
    return null;
  }

  /** Explicit dark surface, or null to use tokens `darkSurface`. */
  darkSurface(): string | null {
    return null;
  }

  /** Explicit dark heading, or null to use tokens `darkHeading`. */
  darkHeading(): string | null {
    return null;
  }

  /**
   * Replacement HTML for a chrome slot, or null to keep the built-in Edge partial.
   * Slots: `sidebar`, `topbar`, `body`, `footer` (Firefly parity).
   * Must include `<!-- ff-hook:… -->` markers (see {@link requiredPartialMarkers}).
   * Edge shells swap `sidebar` / `topbar` / `footer` via `{{{ themePartials.* }}}`.
   */
  partial(_slot: string): string | null {
    return null;
  }

  /** Extra CSS. Must not style the host page outside `.shamar-panel` / auth. */
  extraCss(): string {
    return '';
  }

  /**
   * Stylesheet URL (`/css/midnight.css` or absolute), a {@link themeAsset} token, or null.
   * A plain URL is linked when {@link useTailwind} is false.
   * An asset token links the compiled `public/` file when present; otherwise the
   * browser runtime compiles `resources/` (same as Firefly).
   */
  stylesheet(): string | null {
    return null;
  }

  /**
   * When true, the panel and sign-in page load the **local** Tailwind browser
   * runtime (`{basePath}/assets/tailwind.js`, Firefly `/_firefly/tailwind.js`)
   * and keep the document hidden until `@apply` / hook utilities are in the CSSOM.
   *
   * Prefer `node ace theme:css` for production (compiled `public/css/*.css`).
   * A missing compiled {@link themeAsset} file does **not** require this flag in
   * development — that path loads {@link TAILWIND_CDN_SCRIPT} instead. Production
   * refuses the CDN fallback and expects the compiled file (see
   * {@link assertCompiledThemeOrDevFallback}).
   */
  useTailwind(): boolean {
    return false;
  }

  /** Google font family names (e.g. `Figtree`). Empty adds no font stylesheet. */
  googleFonts(): string[] {
    return [];
  }

  /** Extra classes for the panel root (`.shamar-panel` / body shell). */
  panel(): string {
    return '';
  }

  /** Extra classes for `.shamar-sidebar`. */
  sidebar(): string {
    return '';
  }

  /** Extra classes for `.shamar-topbar`. */
  topbar(): string {
    return '';
  }

  /** Extra classes for brand marks (sidebar / topbar / auth). */
  brand(): string {
    return '';
  }

  /** Extra classes for navigation roots / lists. */
  navigation(): string {
    return '';
  }

  /** Extra classes for `.nav-item` / topbar links. */
  navigationItem(): string {
    return '';
  }

  /** Extra classes for the open page (`.nav-active` / `.is-active` leaf). */
  navigationItemActive(): string {
    return '';
  }

  /** Extra classes for nav groups. */
  navigationGroup(): string {
    return '';
  }

  /** Extra classes for a group that contains the open page. */
  navigationGroupActive(): string {
    return '';
  }

  /** Extra classes for main content / scroll root. */
  content(): string {
    return '';
  }

  /** Extra classes for `.shamar-page-heading` / page header. */
  pageHeader(): string {
    return '';
  }

  /** Extra classes for footer chrome when present. */
  footer(): string {
    return '';
  }

  /** Extra classes for `.shamar-sidebar__user`. */
  sidebarFoot(): string {
    return '';
  }

  /** Extra classes for the user menu / avatar dropdown. */
  userMenu(): string {
    return '';
  }

  /** Extra classes for column cells (optional). */
  column(): string {
    return '';
  }

  /** Extra classes for scroll regions. */
  scroll(): string {
    return '';
  }

  /** Extra classes for the guest auth document. */
  auth(): string {
    return '';
  }

  /** Extra classes for the auth card. */
  authCard(): string {
    return '';
  }
}

/** Alias for Kona / Firefly docs (`FireflyTheme`). */
export { ShamarTheme as FireflyTheme };

/** Stock theme (Kona `KonaTheme` palette adapted to Shamar defaults). */
export class DefaultTheme extends ShamarTheme {
  override id(): string {
    return 'shamar';
  }

  override tokens(): ThemeTokens {
    return {
      primary: '#f1511b',
      accent: '#286291',
      surface: '#ffffff',
      heading: '#111827',
      font: 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
      radius: '0.5rem',
      sidebarWidth: '16rem',
      topbarHeight: '3.75rem',
      bodyBackground: '#f8fafc',
      darkPrimary: '#C9A57B',
      darkSurface: '#1F2937',
      darkHeading: '#F3F4F6',
    };
  }
}

/** Sample theme a panel can select with `theme(new HarborTheme())` (Kona Harbor). */
export class HarborTheme extends ShamarTheme {
  override id(): string {
    return 'harbor';
  }

  override tokens(): ThemeTokens {
    return {
      primary: '#0F6E6E',
      accent: '#74453F',
      surface: '#F3F7F7',
      heading: '#102422',
      font: 'ui-sans-serif, system-ui, sans-serif',
      radius: '0.75rem',
      sidebarWidth: '18rem',
      topbarHeight: '4rem',
      bodyBackground: '#F3F7F7',
      darkPrimary: '#8FCBD6',
      darkSurface: '#102422',
      darkHeading: '#E8D4B8',
    };
  }

  /**
   * Uncompiled source: `resources/css/harbortheme.css`.
   * Compile with `node ace theme:css harbortheme` → `public/css/harbortheme.css`.
   */
  override stylesheet(): string | null {
    return themeAsset('css/harbortheme.css');
  }

  override sidebar(): string {
    return 'harbor-sidebar';
  }

  override brand(): string {
    return 'harbor-brand';
  }

  override extraCss(): string {
    return `.harbor-mark{color:#0F6E6E}`;
  }
}

const THEME_CLASS_EXTRA = '_-:./#%[](),&!';

/** True when `token` can be appended to a `class` attribute. */
export function legalThemeClass(token: string): boolean {
  if (token.length === 0) return false;
  for (const ch of token) {
    if (!/[a-zA-Z0-9]/.test(ch) && !THEME_CLASS_EXTRA.includes(ch)) return false;
  }
  return true;
}

/** Drops blank and illegal tokens. */
export function sanitizeThemeClasses(raw: string): string {
  if (!raw.trim()) return '';
  return raw
    .trim()
    .split(/\s+/)
    .filter((token) => legalThemeClass(token))
    .join(' ');
}

/** Resolved chrome class strings for Edge / auth views. */
export interface ThemeChromeClasses {
  panel: string;
  sidebar: string;
  topbar: string;
  brand: string;
  navigation: string;
  navigationItem: string;
  navigationItemActive: string;
  navigationGroup: string;
  navigationGroupActive: string;
  content: string;
  pageHeader: string;
  footer: string;
  sidebarFoot: string;
  userMenu: string;
  column: string;
  scroll: string;
  auth: string;
  authCard: string;
}

export function resolveThemeChrome(theme: ShamarTheme): ThemeChromeClasses {
  return {
    panel: sanitizeThemeClasses(theme.panel()),
    sidebar: sanitizeThemeClasses(theme.sidebar()),
    topbar: sanitizeThemeClasses(theme.topbar()),
    brand: sanitizeThemeClasses(theme.brand()),
    navigation: sanitizeThemeClasses(theme.navigation()),
    navigationItem: sanitizeThemeClasses(theme.navigationItem()),
    navigationItemActive: sanitizeThemeClasses(theme.navigationItemActive()),
    navigationGroup: sanitizeThemeClasses(theme.navigationGroup()),
    navigationGroupActive: sanitizeThemeClasses(theme.navigationGroupActive()),
    content: sanitizeThemeClasses(theme.content()),
    pageHeader: sanitizeThemeClasses(theme.pageHeader()),
    footer: sanitizeThemeClasses(theme.footer()),
    sidebarFoot: sanitizeThemeClasses(theme.sidebarFoot()),
    userMenu: sanitizeThemeClasses(theme.userMenu()),
    column: sanitizeThemeClasses(theme.column()),
    scroll: sanitizeThemeClasses(theme.scroll()),
    auth: sanitizeThemeClasses(theme.auth()),
    authCard: sanitizeThemeClasses(theme.authCard()),
  };
}

export function defaultTheme(): ShamarTheme {
  return new DefaultTheme();
}

export function resolvePanelTheme(theme: ShamarTheme | undefined | null): ShamarTheme {
  return theme ?? defaultTheme();
}

/** Normalize `#rgb` / `#rrggbb` / bare hex. */
export function normalizeHexColor(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  const match = trimmed.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return undefined;
  const hex = match[1]!;
  if (hex.length === 3) {
    return `#${hex
      .split('')
      .map((char) => char + char)
      .join('')
      .toLowerCase()}`;
  }
  return `#${hex.toLowerCase()}`;
}

function relativeLuminance(red: number, green: number, blue: number): number {
  const linear = (channel: number) => {
    const encoded = channel / 255;
    if (encoded <= 0.04045) return encoded / 12.92;
    return ((encoded + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

/**
 * Dark-mode shade of a normalized `#rrggbb` color. Hue stays (Kona `deriveDarkColor`).
 * Light colors mix 70% color + 30% black; others mix 72% color + 28% white.
 */
export function deriveDarkColor(hex: string): string {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return hex;
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  const light = relativeLuminance(red, green, blue) >= 0.5;
  const keep = light ? 0.7 : 0.72;
  const other = light ? 0 : 255;
  const channel = (value: number) => Math.round(value * keep + other * (1 - keep));
  return `#${[channel(red), channel(green), channel(blue)]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * Panel explicit dark → theme hook → shade of panel light.
 * Null means keep the light color as-is.
 */
export function explicitOrDerivedDark(
  panelDark: string | null | undefined,
  themeDark: string | null | undefined,
  panelLight: string | null | undefined,
): string | null {
  const panel = normalizeHexColor(panelDark ?? undefined);
  if (panel) return panel;
  const theme = normalizeHexColor(themeDark ?? undefined);
  if (theme) return theme;
  if (panelLight) return deriveDarkColor(panelLight);
  return null;
}

/** Panel explicit / theme hook / derived / token fallback (Kona `resolveDarkBrandColor`). */
export function resolveDarkBrandColor(
  panelDark: string | null | undefined,
  themeDark: string | null | undefined,
  panelLight: string | null | undefined,
  fallback: string,
): string {
  return explicitOrDerivedDark(panelDark, themeDark, panelLight) ?? fallback;
}

export function themeDarkOrFallback(raw: string | null | undefined, fallback: string): string {
  return normalizeHexColor(raw ?? undefined) ?? fallback;
}

/** Google Fonts CSS2 URL for theme `googleFonts()` families. */
export function themeGoogleFontsHref(families: string[]): string | null {
  const names = families.map((f) => f.trim()).filter(Boolean);
  if (names.length === 0) return null;
  const query = names
    .map((name) => `family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@400;500;600;700`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}

/**
 * Resolve stylesheet href for `<link>` when the runtime is off.
 * Asset tokens → public URL; plain URLs pass through.
 */
export function resolveThemeStylesheetHref(stylesheet: string | null | undefined): string | null {
  const raw = stylesheet?.trim() ?? '';
  if (!raw) return null;
  if (isThemeAsset(raw)) return themeAssetPublicUrl(raw);
  return raw;
}

export {
  brandColorScaleCss,
  brandColorThemeCss,
  escapeThemeAttr,
  finishCompiledCss,
  holdColor,
  themeCompileSource,
} from './theme-compile.js';

export {
  THEME_PARTIAL_SLOTS,
  fillThemePartialMarkers,
  requiredPartialMarkers,
  resolveThemePartials,
  type ThemePartialSlot,
  type ThemePartials,
} from './theme-partials.js';
