import { fileURLToPath } from 'node:url';
import { publishAuthViews } from './publish_auth.js';

export const stubsRoot = fileURLToPath(new URL('../stubs', import.meta.url));

interface ConfigureCommand {
  logger: {
    info(message: string): void;
    success(message: string): void;
  };
  prompt: {
    choice(
      message: string,
      choices: Array<string | { name: string; message: string }>,
      options?: { default?: number; name?: string },
    ): Promise<string>;
    confirm(title: string, options?: { default?: boolean }): Promise<boolean>;
  };
  createCodemods(): Promise<{
    overwriteExisting: boolean;
    updateRcFile(
      callback: (rcFile: {
        addProvider(provider: string): void;
        addCommand(command: string): void;
      }) => void,
    ): Promise<void>;
    makeUsingStub(
      root: string,
      stub: string,
      data: Record<string, unknown>,
    ): Promise<unknown>;
  }>;
  application?: { makePath(...segments: string[]): string };
  app?: { makePath(...segments: string[]): string };
}

export async function configure(command: ConfigureCommand): Promise<void> {
  const orm = await command.prompt.choice(
    'Which ORM should Shamar use for resources?',
    [
      {
        name: 'lucid',
        message: 'Lucid (SQL — PostgreSQL, MySQL, SQLite, …)',
      },
      {
        name: 'mongoose',
        message: 'Mongoose (MongoDB)',
      },
    ],
    { default: 0, name: 'orm' },
  );

  const publishLogin = await command.prompt.confirm(
    'Publish opinionated Shamar login page?',
    { default: true },
  );

  const codemods = await command.createCodemods();

  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('@shamar/adonis/provider');
    rcFile.addCommand('@shamar/adonis/commands');
  });

  await codemods.makeUsingStub(stubsRoot, 'config/shamar.stub', { orm });

  if (publishLogin) {
    await publishAuthViews(command, { skipConfirm: true });
  }
}
