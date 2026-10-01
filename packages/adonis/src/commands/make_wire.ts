import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { args, BaseCommand } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';
import { parseWireName } from '../wire/naming.js';

/**
 * `node ace make:wire counter`
 * `node ace make:wire posts/form`
 */
export default class MakeWire extends BaseCommand {
  static commandName = 'make:wire';
  static description = 'Create a Wire component class and its Edge view';
  static options: CommandOptions = { startApp: false };

  @args.string({ description: 'Component name, for example counter or posts/form' })
  declare name: string;

  async run() {
    const parsed = parseWireName(this.name);
    const classFile = this.app.makePath('app/wire', `${parsed.file}.ts`);
    const viewFile = this.app.makePath('resources/views/wire', `${parsed.file}.edge`);

    await mkdir(dirname(classFile), { recursive: true });
    await mkdir(dirname(viewFile), { recursive: true });
    await writeFile(classFile, classStub(parsed.className), { flag: 'wx' }).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'EEXIST') throw error;
      this.logger.warning(`Already exists: ${classFile}`);
    });
    await writeFile(viewFile, viewStub(parsed.className), { flag: 'wx' }).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'EEXIST') throw error;
      this.logger.warning(`Already exists: ${viewFile}`);
    });

    this.logger.success(`Class  app/wire/${parsed.file}.ts`);
    this.logger.success(`View   resources/views/wire/${parsed.file}.edge`);
    this.logger.info(`Use @wire('${parsed.tag}') in an Edge template`);
  }
}

function classStub(className: string): string {
  return `import { Wire } from '@shamar/adonis'

export default class ${className} extends Wire {
  count = 0

  increment() {
    this.count++
  }
}
`;
}

function viewStub(className: string): string {
  return `<div>
  <h1>${className}</h1>
  <button type="button" wire:click="increment">{{ count }}</button>
</div>
`;
}
