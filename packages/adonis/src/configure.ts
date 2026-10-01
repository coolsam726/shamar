import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishAuthViews } from './publish_auth.js';
import { patchSessionAuthForMongoose, sessionAuthUsesStockLucidProvider } from './mongo_auth.js';
import { panelStub } from './commands/make_panel.js';

export const stubsRoot = fileURLToPath(new URL('../stubs', import.meta.url));

const MONGO_PROVIDER = '@shamar/adonis/mongo_provider';
const MONGO_AUTH_RELATIVE = 'app/auth/session_mongoose_user_provider.ts';

interface ConfigureCommand {
  logger: {
    info(message: string): void;
    success(message: string): void;
    warning?(message: string): void;
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
    defineEnvVariables?(
      variables: Record<string, string>,
      options?: { omitFromExample?: string[] },
    ): Promise<void>;
    defineEnvValidations?(validations: Record<string, string>): Promise<void>;
    installPackages?(packages: Array<{ name: string; isDevDependency: boolean }>): Promise<boolean>;
    listPackagesToInstall?(packages: Array<{ name: string; isDevDependency: boolean }>): Promise<void>;
  }>;
  application?: { makePath(...segments: string[]): string };
  app?: { makePath(...segments: string[]): string };
}

function appMakePath(command: ConfigureCommand): (...segments: string[]) => string {
  const app = command.app ?? command.application;
  if (app?.makePath) return (...segments) => app.makePath(...segments);
  return (...segments) => join(process.cwd(), ...segments);
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

  const publishLogin = await command.prompt.confirm('Publish opinionated Shamar login page?', {
    default: true,
  });

  const useMongoSession = orm === 'mongoose' && publishLogin ? await promptMongoSession(command) : false;

  const codemods = await command.createCodemods();

  await codemods.updateRcFile((rcFile) => {
    if (orm === 'mongoose') {
      rcFile.addProvider(MONGO_PROVIDER);
    }
    rcFile.addProvider('@shamar/adonis/provider');
    rcFile.addCommand('@shamar/adonis/commands');
  });

  await codemods.makeUsingStub(stubsRoot, 'config/shamar.stub', { orm });

  if (orm === 'mongoose') {
    await installMongoConnection(command, codemods);
  }

  await ensureAdminPanelClass(command);

  if (publishLogin) {
    await publishAuthViews(command, { skipConfirm: true });
  }

  if (useMongoSession) {
    await publishMongoSession(command);
  }
}

async function promptMongoSession(command: ConfigureCommand): Promise<boolean> {
  const authPath = appMakePath(command)('config/auth.ts');
  let stock = false;
  try {
    stock = sessionAuthUsesStockLucidProvider(await readFile(authPath, 'utf8'));
  } catch {
    stock = false;
  }
  return command.prompt.confirm('Use MongoDB documents for session login?', { default: stock });
}

async function installMongoConnection(
  command: ConfigureCommand,
  codemods: Awaited<ReturnType<ConfigureCommand['createCodemods']>>,
): Promise<void> {
  await codemods.defineEnvVariables?.({
    MONGO_URI: 'mongodb://127.0.0.1:27017/app',
  });
  await codemods.defineEnvValidations?.({
    MONGO_URI: 'Env.schema.string()',
  });

  const packages = [{ name: 'mongoose', isDevDependency: false }];
  const installed = (await codemods.installPackages?.(packages)) ?? false;
  if (!installed) {
    await codemods.listPackagesToInstall?.(packages);
  }
  command.logger.success('Registered the MongoDB connection (MONGO_URI)');
}

async function publishMongoSession(command: ConfigureCommand): Promise<void> {
  const makePath = appMakePath(command);
  const destination = makePath(MONGO_AUTH_RELATIVE);
  let exists = false;
  try {
    await access(destination);
    exists = true;
  } catch {
    exists = false;
  }

  if (exists) {
    const overwrite = await command.prompt.confirm(`Overwrite existing ${MONGO_AUTH_RELATIVE}?`, {
      default: false,
    });
    if (!overwrite) {
      command.logger.info('Kept the existing MongoDB session user provider');
    } else {
      await copyAuthStub(destination);
      command.logger.info(`create ${MONGO_AUTH_RELATIVE}`);
    }
  } else {
    await copyAuthStub(destination);
    command.logger.info(`create ${MONGO_AUTH_RELATIVE}`);
  }

  const authFile = makePath('config/auth.ts');
  let source: string;
  try {
    source = await readFile(authFile, 'utf8');
  } catch {
    command.logger.info(
      'config/auth.ts was not found. Point the session guard at SessionMongooseUserProvider.',
    );
    return;
  }

  const patched = patchSessionAuthForMongoose(source);
  if (!patched.patched) {
    command.logger.info(
      'config/auth.ts does not use the default Lucid session provider. Set its provider to SessionMongooseUserProvider yourself.',
    );
    return;
  }

  await writeFile(authFile, patched.contents);
  command.logger.success('Session login now loads users from MongoDB');
}

async function copyAuthStub(destination: string): Promise<void> {
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(join(stubsRoot, 'auth/session_mongoose_user_provider.ts'), destination);
}

async function ensureAdminPanelClass(command: ConfigureCommand): Promise<void> {
  const relative = 'app/panels/admin/panel.ts';
  const destination = appMakePath(command)(relative);
  try {
    await access(destination);
    return;
  } catch {
    /* create the default panel */
  }
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, panelStub('AdminPanel', 'admin'));
  command.logger.success(`Panel  ${relative}`);
}
