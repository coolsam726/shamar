import { access, copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { stubsRoot } from './configure.js';

export const AUTH_VIEW_FILES = [
  {
    source: 'views/auth/layout.edge',
    relativePath: 'resources/views/components/layouts/auth.edge',
  },
  {
    source: 'views/auth/login.edge',
    relativePath: 'resources/views/pages/auth/login.edge',
  },
] as const;

/** @deprecated Use AUTH_VIEW_FILES */
export const AUTH_VIEW_STUBS = AUTH_VIEW_FILES;

interface PublishAuthCommand {
  application?: { makePath(...segments: string[]): string };
  app?: { makePath(...segments: string[]): string };
  logger: {
    info(message: string): void;
    success(message: string): void;
  };
  prompt: {
    confirm(title: string, options?: { default?: boolean }): Promise<boolean>;
  };
}

export interface PublishAuthViewsOptions {
  /** Overwrite without prompting when targets already exist. */
  force?: boolean;
  /** Skip the initial “publish?” confirm (used by configure after its own prompt). */
  skipConfirm?: boolean;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function appMakePath(command: PublishAuthCommand): (...segments: string[]) => string {
  const app = command.app ?? command.application;
  if (app?.makePath) return (...segments) => app.makePath(...segments);
  return (...segments) => join(process.cwd(), ...segments);
}

/**
 * Publish opinionated auth layout + login Edge views into the host app.
 * Sources are raw `.edge` files (not Tempura stubs) so Edge syntax is preserved.
 */
export async function publishAuthViews(
  command: PublishAuthCommand,
  options: PublishAuthViewsOptions = {},
): Promise<boolean> {
  const makePath = appMakePath(command);
  const existing: string[] = [];
  for (const entry of AUTH_VIEW_FILES) {
    if (await pathExists(makePath(entry.relativePath))) {
      existing.push(entry.relativePath);
    }
  }

  if (!options.skipConfirm && existing.length === 0) {
    const proceed = await command.prompt.confirm('Publish Shamar login page views?', {
      default: true,
    });
    if (!proceed) {
      command.logger.info('Skipped publishing auth views');
      return false;
    }
  }

  if (existing.length > 0 && !options.force) {
    const overwrite = await command.prompt.confirm(
      `Overwrite existing auth views?\n  - ${existing.join('\n  - ')}`,
      { default: false },
    );
    if (!overwrite) {
      command.logger.info('Skipped publishing auth views (existing files kept)');
      return false;
    }
  }

  for (const entry of AUTH_VIEW_FILES) {
    const from = join(stubsRoot, entry.source);
    const to = makePath(entry.relativePath);
    await mkdir(dirname(to), { recursive: true });
    await copyFile(from, to);
    command.logger.info(`create ${entry.relativePath}`);
  }

  command.logger.success('Published Shamar auth views');
  return true;
}
