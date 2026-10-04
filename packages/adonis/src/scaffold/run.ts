import type { BaseCommand } from '@adonisjs/core/ace';
import { stubsRoot } from '../configure.js';

export async function scaffoldFromStub(
  command: BaseCommand,
  stub: string,
  data: Record<string, unknown>,
  options?: { force?: boolean },
): Promise<void> {
  const codemods = await command.createCodemods();
  if (options?.force) {
    codemods.overwriteExisting = true;
  }
  await codemods.makeUsingStub(stubsRoot, stub, data);
}
