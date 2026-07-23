import { BaseCommand, flags } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';
import { publishAuthViews } from '../publish_auth.js';

/**
 * Publish the opinionated Shamar login layout + page into the host app.
 */
export default class PublishAuth extends BaseCommand {
  static commandName = 'shamar:publish-auth';
  static description =
    'Publish opinionated Shamar auth layout and login page into the application';

  static options: CommandOptions = {};

  @flags.boolean({
    description: 'Overwrite existing auth views without confirmation',
    alias: 'f',
  })
  declare force: boolean;

  async run() {
    await publishAuthViews(this, { force: this.force });
  }
}
