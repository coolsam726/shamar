import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { args, BaseCommand, flags } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';

/**
 * `node ace make:theme MidnightTheme`
 *
 * Firefly `./grind make:firefly-theme` parity.
 * Writes `app/panels/{panel}/themes/MidnightTheme.ts` and `resources/css/midnighttheme.css`.
 */
export default class MakeTheme extends BaseCommand {
  static commandName = 'make:theme';
  static description = 'Create a Shamar panel theme class (Firefly theme parity)';
  static options: CommandOptions = { startApp: false };

  @args.string({ description: 'Theme class name, for example MidnightTheme' })
  declare name: string;

  @flags.string({ description: 'Panel id package under app/panels (default admin)' })
  declare panel: string;

  async run() {
    const className = this.name.trim().replace(/[^a-zA-Z0-9_]/g, '');
    if (!className || !/^[A-Za-z]/.test(className)) {
      this.logger.error(`Invalid theme name: ${this.name}`);
      this.exitCode = 1;
      return;
    }
    const panelId = (this.panel?.trim() || 'admin').replace(/^\/+|\/+$/g, '');
    const themeId = className.toLowerCase();
    const cssSlug = themeId;
    const file = this.app.makePath('app/panels', panelId, 'themes', `${className}.ts`);
    const cssFile = this.app.makePath('resources/css', `${cssSlug}.css`);

    await mkdir(dirname(file), { recursive: true });
    await mkdir(dirname(cssFile), { recursive: true });

    const wroteTs = await writeFile(file, themeStub(className, themeId, cssSlug), {
      flag: 'wx',
    }).then(
      () => true,
      (error: NodeJS.ErrnoException) => {
        if (error.code !== 'EEXIST') throw error;
        this.logger.warning(`Already exists: ${file}`);
        return false;
      },
    );
    const wroteCss = await writeFile(cssFile, cssStub(cssSlug), { flag: 'wx' }).then(
      () => true,
      (error: NodeJS.ErrnoException) => {
        if (error.code !== 'EEXIST') throw error;
        this.logger.warning(`Already exists: ${cssFile}`);
        return false;
      },
    );

    if (wroteTs) this.logger.success(`Theme  app/panels/${panelId}/themes/${className}.ts`);
    if (wroteCss) this.logger.success(`CSS    resources/css/${cssSlug}.css`);
    this.logger.info(`Register: panel('${panelId}').theme(new ${className}())`);
    this.logger.info(`Compile:  node ace theme:css ${cssSlug}`);
    this.logger.info(
      `Output:   public/css/${cssSlug}.css (preferred). Missing compile → CDN Tailwind in development only.`,
    );
  }
}

export function themeStub(className: string, themeId: string, cssSlug: string): string {
  return `import { ShamarTheme, themeAsset } from '@shamar/core'

/**
 * Panel chrome theme (Firefly \`FireflyTheme\` parity).
 * Override hooks to append classes; put rules in resources/css/${cssSlug}.css.
 */
export default class ${className} extends ShamarTheme {
  id() {
    return '${themeId}'
  }

  stylesheet() {
    return themeAsset('css/${cssSlug}.css')
  }

  // sidebar() { return '${themeId}-sidebar' }
  // brand() { return '${themeId}-brand' }
  // content() { return '${themeId}-wide' }
  // authCard() { return '${themeId}-card' }
}
`;
}

export function cssStub(cssSlug: string): string {
  return `/* shamar-theme: ${cssSlug} */
/* Compile with: node ace theme:css ${cssSlug} → public/css/${cssSlug}.css */
/* Dev only: if public/ is missing, the panel loads Tailwind from the CDN. */
/* Production requires the compiled file (or explicit useTailwind() + local runtime). */

.shamar-panel .shamar-sidebar.${cssSlug}-sidebar {
  /* @apply bg-primary-900 text-white; */
}

.shamar-panel .${cssSlug}-brand .shamar-brand-name,
.shamar-auth .${cssSlug}-brand .shamar-brand-name {
  /* @apply text-lg font-semibold; */
}
`;
}
