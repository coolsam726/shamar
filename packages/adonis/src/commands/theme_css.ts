import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BaseCommand, args } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';
import {
  THEME_CSS_COMMAND,
  THEME_CSS_MARKER,
  finishCompiledCss,
  themeCompileSource,
} from '@shamar/core';

const TAILWIND_VERSION = '4.3.5';
const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * `node ace theme:css` [name]
 *
 * Firefly `./grind firefly:theme-css` parity — compiles marked theme stylesheets
 * under `resources/css/` into `public/css/` with `@apply` expanded.
 */
export default class ThemeCss extends BaseCommand {
  static commandName = 'theme:css';
  static description =
    'Compile Shamar theme stylesheets (resources/css → public/css, Firefly theme-css parity)';
  static options: CommandOptions = { startApp: false };

  @args.string({ description: 'Optional theme slug (e.g. midnighttheme)', required: false })
  declare name?: string;

  async run() {
    const base = this.app.makePath();
    try {
      const written = compileThemes(base, this.name?.trim() || null);
      for (const path of written) {
        this.logger.success(`Wrote ${path}`);
      }
      if (written.length === 0) {
        this.logger.info('No theme stylesheets compiled.');
      }
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : String(error));
      this.exitCode = 1;
    }
  }
}

/** Compiles every marked theme stylesheet, or the one `name` selects. */
export function compileThemes(base: string, name: string | null): string[] {
  const sources = themeSources(base, name);
  const written: string[] = [];
  for (const source of sources) {
    const output = join(base, 'public/css', source.split(/[/\\]/).pop()!);
    compileSource(source, output, base);
    written.push(output);
  }
  return written;
}

export function themeSources(base: string, name: string | null): string[] {
  const dir = join(base, 'resources/css');
  if (name) {
    const slug = themeSlug(name);
    const file = join(dir, `${slug}.css`);
    if (!existsSync(file)) {
      throw new Error(
        `Missing theme stylesheet resources/css/${slug}.css. Run node ace make:theme, then ${THEME_CSS_COMMAND}`,
      );
    }
    return [file];
  }
  if (!existsSync(dir)) {
    throw new Error(
      `No Shamar theme stylesheets under resources/css. Run node ace make:theme, then ${THEME_CSS_COMMAND}`,
    );
  }
  const found = readdirSync(dir)
    .filter((filename) => filename.endsWith('.css'))
    .map((filename) => join(dir, filename))
    .filter((path) => {
      const text = readFileSync(path, 'utf8');
      return text.includes(THEME_CSS_MARKER) || text.includes('firefly-theme');
    })
    .sort();
  if (found.length === 0) {
    throw new Error(
      `No Shamar theme stylesheets under resources/css. Mark the file with /* ${THEME_CSS_MARKER} */ or run node ace make:theme, then ${THEME_CSS_COMMAND}`,
    );
  }
  return found;
}

export function themeSlug(name: string): string {
  let value = name.trim();
  if (value.toLowerCase().endsWith('.css')) value = value.slice(0, -4);
  value = value.toLowerCase();
  if (!/^[a-z][a-z0-9_-]*$/.test(value)) {
    throw new Error(
      `Theme stylesheet name [${name}] is not a file slug. Run ${THEME_CSS_COMMAND} with the theme id, for example midnighttheme`,
    );
  }
  return value;
}

/**
 * Tailwind `@source` globs for panel theme classes under app/panels/.../themes.
 */
export function themeClassSources(base: string): string[] {
  const panels = join(base, 'app/panels');
  if (!existsSync(panels)) return [];
  const found: string[] = [];
  walkThemes(panels, found);
  return found.sort();
}

function walkThemes(dir: string, found: string[]): void {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    const path = join(dir, name);
    let isDir = false;
    try {
      isDir = statSync(path).isDirectory();
    } catch {
      continue;
    }
    if (!isDir) continue;
    if (name === 'themes') {
      found.push(`${path.replace(/\\/g, '/')}/**/*.{ts,js}`);
      continue;
    }
    walkThemes(path, found);
  }
}

export function compileSource(source: string, output: string, appRoot: string): void {
  const modules = tailwindModules();
  const cli = join(modules, '@tailwindcss/cli/dist/index.mjs');
  if (!existsSync(cli)) {
    throw new Error(
      `Tailwind CLI ${TAILWIND_VERSION} is missing at ${cli}. Run ${THEME_CSS_COMMAND} once Node.js can install it`,
    );
  }
  // Scratch files must live next to node_modules so `@import "tailwindcss/theme"`
  // resolves (Firefly ThemeCssCompiler writes temps under the Tailwind home).
  const home = dirname(modules);
  const scratch = mkdtempSync(join(home, 'theme-css-'));
  const input = join(scratch, 'input.css');
  const compiled = join(scratch, 'output.css');
  try {
    const sources = themeClassSources(appRoot);
    writeFileSync(input, themeCompileSource(readFileSync(source, 'utf8'), sources));
    const result = spawnSync(
      process.execPath,
      [cli, '--input', input, '--output', compiled, '--cwd', home, '--silent'],
      { cwd: home, encoding: 'utf8', timeout: 60_000 },
    );
    if (result.status !== 0) {
      const detail = (result.stderr || result.stdout || '').trim().slice(0, 500);
      throw new Error(
        `Theme CSS compile failed (${result.status ?? 'spawn'}). ${detail || 'Run ' + THEME_CSS_COMMAND}`,
      );
    }
    if (!existsSync(compiled)) {
      throw new Error(
        `Theme CSS compile wrote no output for ${source}. Run ${THEME_CSS_COMMAND}`,
      );
    }
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, finishCompiledCss(readFileSync(compiled, 'utf8')));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function tailwindModules(): string {
  const bundled = join(PACKAGE_ROOT, 'tailwind/node_modules');
  if (validModules(bundled)) return bundled;
  const cache = join(homedir(), '.cache', 'shamar', `tailwind-${TAILWIND_VERSION}`, 'node_modules');
  if (validModules(cache)) return cache;
  const cacheRoot = dirname(cache);
  mkdirSync(cacheRoot, { recursive: true });
  const install = spawnSync(
    'npm',
    ['install', '--prefix', cacheRoot, `@tailwindcss/cli@${TAILWIND_VERSION}`],
    { encoding: 'utf8', timeout: 180_000 },
  );
  if (install.status !== 0 || !validModules(cache)) {
    const detail = (install.stderr || install.stdout || '').trim().slice(0, 300);
    throw new Error(
      `Could not install @tailwindcss/cli@${TAILWIND_VERSION}. ${detail} Run ${THEME_CSS_COMMAND} when Node.js is available`,
    );
  }
  return cache;
}

function validModules(dir: string): boolean {
  return existsSync(join(dir, '@tailwindcss/cli'));
}
