import { fileURLToPath } from 'node:url';

export const stubsRoot = fileURLToPath(new URL('../stubs', import.meta.url));

interface ConfigureCommand {
  prompt: {
    choice(
      message: string,
      choices: Array<string | { name: string; message: string }>,
      options?: { default?: number; name?: string },
    ): Promise<string>;
  };
  createCodemods(): Promise<{
    updateRcFile(
      callback: (rcFile: { addProvider(provider: string): void }) => void,
    ): Promise<void>;
    makeUsingStub(
      root: string,
      stub: string,
      data: Record<string, unknown>,
    ): Promise<void>;
  }>;
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

  const codemods = await command.createCodemods();

  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('@shamar/adonis/provider');
  });

  await codemods.makeUsingStub(stubsRoot, 'config/shamar.stub', { orm });
}
