import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { args, BaseCommand } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';

/**
 * `node ace make:panel admin`
 *
 * Creates `app/panels/admin/panel.ts`. The Shamar provider discovers it.
 * `config/shamar.ts` keeps auth, branding, and the database choice.
 */
export default class MakePanel extends BaseCommand {
  static commandName = 'make:panel';
  static description = 'Create a Shamar panel class under app/panels';
  static options: CommandOptions = { startApp: false };

  @args.string({ description: 'Panel id, for example admin or billing' })
  declare name: string;

  async run() {
    const id = this.name.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!id || id.split('/').some((part) => !part || part === '.' || part === '..')) {
      this.logger.error(`Invalid panel name: ${this.name}`);
      this.exitCode = 1;
      return;
    }
    const className = id
      .split('/')
      .at(-1)!
      .split(/[-_]/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')
      .concat('Panel');
    const file = this.app.makePath('app/panels', id, 'panel.ts');
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, panelStub(className, id.split('/').at(-1)!), { flag: 'wx' }).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code !== 'EEXIST') throw error;
        this.logger.warning(`Already exists: ${file}`);
      },
    );
    this.logger.success(`Panel  app/panels/${id}/panel.ts`);
    this.logger.info('Resources: app/panels/' + id + '/resources');
    this.logger.info('Pages:     app/panels/' + id + '/pages');
  }
}

export function panelStub(className: string, id: string): string {
  return `import { PanelProvider, panel } from '@shamar/adonis'

export default class ${className} extends PanelProvider {
  panel() {
    return panel('${id}')
      .path('/${id}')
      .discoverResources('app/panels/${id}/resources')
      .discoverPages('app/panels/${id}/pages')
  }
}
`;
}
