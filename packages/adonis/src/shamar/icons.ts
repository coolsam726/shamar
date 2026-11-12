import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Blade Icons–style icon factory (Kona Firefly / kona-icons parity).
 *
 * Heroicons ship under prefix `heroicon`:
 * - `heroicon-o-home` outline
 * - `heroicon-s-home` solid
 * - `heroicon-m-home` mini
 *
 * Short names such as `home` resolve to `heroicon-o-home`. Register more sets
 * with {@link Icons.add} (e.g. prefix `fas` for Font Awesome later).
 */

export interface IconSetOptions {
  /** Unique set prefix used in ids (`heroicon`, `fas`, …). */
  prefix: string;
  /** Absolute or package-relative filesystem directory of `{variant}-{name}.svg` files. */
  path?: string;
  paths?: string[];
  /** Default CSS class on every icon from this set. */
  className?: string;
  /** Default HTML attributes merged onto the root `<svg>`. */
  attributes?: Record<string, string>;
  /** Icon name (without set prefix) when the requested icon is missing. */
  fallback?: string;
}

export interface IconSet {
  name: string;
  prefix: string;
  paths: string[];
  className?: string;
  attributes: Record<string, string>;
  fallback?: string;
}

export class IconNotFoundError extends Error {
  constructor(name: string) {
    super(`Icon [${name}] not found`);
    this.name = 'IconNotFoundError';
  }
}

export class CannotRegisterIconSetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CannotRegisterIconSetError';
  }
}

function escapeHtmlAttr(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function parseSvgOpenAttributes(openTag: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const match of openTag.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) {
    result.set(match[1]!, match[2]!);
  }
  for (const match of openTag.matchAll(/([\w:-]+)\s*=\s*'([^']*)'/g)) {
    if (!result.has(match[1]!)) result.set(match[1]!, match[2]!);
  }
  return result;
}

function mergeSvgAttributes(contents: string, attributes: Record<string, string>): string {
  const trimmed = contents.trim();
  if (!trimmed.toLowerCase().startsWith('<svg')) {
    throw new IconNotFoundError('SVG root missing');
  }
  const openEnd = trimmed.indexOf('>');
  if (openEnd <= 0) throw new IconNotFoundError('SVG root missing');
  const openTag = trimmed.slice(0, openEnd);
  const rest = trimmed.slice(openEnd);
  const merged = parseSvgOpenAttributes(openTag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key.toLowerCase() === 'class') {
      const prior = merged.get('class');
      merged.set('class', prior ? `${prior} ${value}`.trim() : value);
    } else {
      merged.set(key, value);
    }
  }
  const attrText = [...merged.entries()]
    .map(([key, value]) => `${key}="${escapeHtmlAttr(value)}"`)
    .join(' ');
  return attrText ? `<svg ${attrText}${rest}` : `<svg${rest}`;
}

export class Svg {
  private readonly attributes: Map<string, string>;

  constructor(
    private readonly iconName: string,
    private readonly rawContents: string,
    attributes: Record<string, string> = {},
  ) {
    this.attributes = new Map(Object.entries(attributes));
  }

  name(): string {
    return this.iconName;
  }

  contents(): string {
    return this.rawContents;
  }

  className(value: string): this {
    const existing = this.attributes.get('class');
    this.attributes.set('class', existing ? `${existing} ${value}`.trim() : value);
    return this;
  }

  attr(name: string, value: string): this {
    if (name.toLowerCase() === 'class') return this.className(value);
    this.attributes.set(name, value);
    return this;
  }

  attributesMap(values: Record<string, string>): this {
    for (const [key, value] of Object.entries(values)) this.attr(key, value);
    return this;
  }

  toHtml(): string {
    return mergeSvgAttributes(this.rawContents, Object.fromEntries(this.attributes));
  }

  toString(): string {
    return this.toHtml();
  }
}

function packageResourcesRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '../../resources/icons');
}

function optionalName(value: string | undefined | null): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

const sets = new Map<string, IconSet>();
const prefixIndex = new Map<string, string>();
const contentCache = new Map<string, string>();
let defaultSet: string | null = null;
let globalFallback: string | null = null;

function loadContents(set: IconSet, icon: string): string | undefined {
  const cacheKey = `${set.name}:${icon}`;
  const cached = contentCache.get(cacheKey);
  if (cached) return cached;
  const fileName = icon.endsWith('.svg') ? icon : `${icon}.svg`;
  for (const root of set.paths) {
    const file = join(root, fileName);
    if (!existsSync(file)) continue;
    const text = readFileSync(file, 'utf8');
    contentCache.set(cacheKey, text);
    return text;
  }
  return undefined;
}

function splitSetAndName(name: string): { set: IconSet; icon: string } {
  const byPrefix = [...prefixIndex.entries()]
    .sort((a, b) => b[0].length - a[0].length)
    .find(([prefix]) => name === prefix || name.startsWith(`${prefix}-`));
  if (byPrefix) {
    const set = sets.get(byPrefix[1])!;
    const icon = name === set.prefix ? '' : name.slice(set.prefix.length + 1);
    if (!icon) throw new IconNotFoundError(name);
    return { set, icon };
  }
  if (!defaultSet || !sets.has(defaultSet)) throw new IconNotFoundError(name);
  return { set: sets.get(defaultSet)!, icon: name };
}

function resolveSvg(
  name: string,
  className = '',
  attributes: Record<string, string> = {},
): Svg {
  const { set, icon } = splitSetAndName(name);
  const contents =
    loadContents(set, icon) ??
    (set.fallback ? loadContents(set, set.fallback) : undefined);
  if (!contents) throw new IconNotFoundError(name);
  const attrs: Record<string, string> = { ...set.attributes, ...attributes };
  if (set.className) attrs.class = set.className;
  const svg = new Svg(name, contents, attrs);
  if (className) svg.className(className);
  return svg;
}

/** Nav / chrome defaults matching Firefly `NavIcons`. */
export const NavIcons = {
  DEFAULT: 'heroicon-o-squares-2x2',
  HOME: 'heroicon-o-home',
  resolve(name?: string | null): string {
    if (name == null || !String(name).trim()) return NavIcons.DEFAULT;
    const trimmed = String(name).trim();
    if (Icons.usesRegisteredPrefix(trimmed)) return trimmed;
    return `heroicon-o-${trimmed}`;
  },
  defaultForDashboard(isDashboard: boolean): string {
    return isDashboard ? NavIcons.HOME : NavIcons.DEFAULT;
  },
} as const;

export interface IconsApi {
  ensureDefaults(): void;
  add(name: string, options: IconSetOptions): IconsApi;
  defaultSet(): string | null;
  setDefault(name: string): IconsApi;
  setFallback(name: string | null | undefined): IconsApi;
  fallback(): string | null;
  all(): Map<string, IconSet>;
  usesRegisteredPrefix(name: string): boolean;
  has(name: string): boolean;
  svg(name: string, className?: string, attributes?: Record<string, string>): Svg;
  reset(): void;
  bundledHeroiconCount(): number;
}

export const Icons: IconsApi = {
  ensureDefaults(): void {
    if (!sets.has('heroicons')) {
      Icons.add('heroicons', {
        prefix: 'heroicon',
        path: join(packageResourcesRoot(), 'heroicons'),
      });
    }
  },

  add(name: string, options: IconSetOptions): IconsApi {
    const prefix = options.prefix.trim();
    if (!prefix) {
      throw new CannotRegisterIconSetError(`Icon set [${name}] is missing a prefix`);
    }
    const paths = [...(options.path ? [options.path] : []), ...(options.paths ?? [])].map((p) =>
      p.startsWith('/') ? p : join(process.cwd(), p),
    );
    if (paths.length === 0) {
      throw new CannotRegisterIconSetError(
        `Icon set [${name}] is missing paths`,
      );
    }
    for (const path of paths) {
      if (!existsSync(path)) {
        throw new CannotRegisterIconSetError(
          `Icon set [${name}] path does not exist [${path}]`,
        );
      }
    }
    const colliding = prefixIndex.get(prefix);
    if (colliding && colliding !== name) {
      throw new CannotRegisterIconSetError(
        `Icon set [${name}] prefix [${prefix}] collides with set [${colliding}]`,
      );
    }
    const set: IconSet = {
      name,
      prefix,
      paths,
      className: options.className,
      attributes: { ...(options.attributes ?? {}) },
      fallback: optionalName(options.fallback),
    };
    sets.set(name, set);
    prefixIndex.set(prefix, name);
    for (const key of [...contentCache.keys()]) {
      if (key.startsWith(`${name}:`)) contentCache.delete(key);
    }
    if (!defaultSet) defaultSet = name;
    return Icons;
  },

  defaultSet(): string | null {
    Icons.ensureDefaults();
    return defaultSet;
  },

  setDefault(name: string): IconsApi {
    Icons.ensureDefaults();
    if (!sets.has(name)) {
      throw new CannotRegisterIconSetError(`Unknown icon set [${name}]`);
    }
    defaultSet = name;
    return Icons;
  },

  setFallback(name: string | null | undefined): IconsApi {
    globalFallback = optionalName(name) ?? null;
    return Icons;
  },

  fallback(): string | null {
    return globalFallback;
  },

  all(): Map<string, IconSet> {
    Icons.ensureDefaults();
    return new Map(sets);
  },

  /** True when `name` begins with a registered set prefix and a hyphen. */
  usesRegisteredPrefix(name: string): boolean {
    Icons.ensureDefaults();
    const trimmed = name.trim();
    if (!trimmed) return false;
    for (const prefix of prefixIndex.keys()) {
      if (
        trimmed.length > prefix.length &&
        trimmed.startsWith(prefix) &&
        trimmed[prefix.length] === '-'
      ) {
        return true;
      }
    }
    return false;
  },

  has(name: string): boolean {
    Icons.ensureDefaults();
    try {
      Icons.svg(name);
      return true;
    } catch {
      return false;
    }
  },

  svg(name: string, className = '', attributes: Record<string, string> = {}): Svg {
    Icons.ensureDefaults();
    const trimmed = name.trim();
    if (!trimmed) throw new IconNotFoundError(name);
    try {
      return resolveSvg(trimmed, className, attributes);
    } catch (error) {
      if (error instanceof IconNotFoundError && globalFallback && globalFallback !== trimmed) {
        return resolveSvg(globalFallback, className, attributes);
      }
      throw error;
    }
  },

  reset(): void {
    sets.clear();
    prefixIndex.clear();
    contentCache.clear();
    defaultSet = null;
    globalFallback = null;
  },

  /** Debug helper: count SVG files under the default Heroicons path. */
  bundledHeroiconCount(): number {
    Icons.ensureDefaults();
    const set = sets.get('heroicons');
    if (!set?.paths[0]) return 0;
    try {
      return readdirSync(set.paths[0]).filter((f) => f.endsWith('.svg')).length;
    } catch {
      return 0;
    }
  },
};

/**
 * Resolve a panel/resource/action icon name to SVG HTML.
 * Accepts short names or full stack ids; falls back to squares-2x2.
 */
export function iconSvg(
  name?: string | null,
  className = 'w-4 h-4',
  attributes: Record<string, string> = {},
): string {
  const resolved = NavIcons.resolve(name);
  try {
    return Icons.svg(resolved)
      .className(className)
      .attr('aria-hidden', 'true')
      .attributesMap(attributes)
      .toHtml();
  } catch {
    return Icons.svg(NavIcons.DEFAULT)
      .className(className)
      .attr('aria-hidden', 'true')
      .attributesMap(attributes)
      .toHtml();
  }
}
