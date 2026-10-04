import { BaseCommand, args, flags } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';
import { parseWidgetName } from '../scaffold/names.js';
import { scaffoldFromStub } from '../scaffold/run.js';

const WIDGET_KINDS = ['stats', 'list', 'chart', 'card'] as const;

/**
 * Scaffold a Shamar dashboard Widget class under app/widgets/{panel}.
 *
 * @example
 * ```bash
 * node ace shamar:make-widget ProductStats --type=stats
 * ```
 */
export default class MakeWidget extends BaseCommand {
  static commandName = 'shamar:make-widget';
  static description = 'Scaffold a Shamar dashboard widget (Filament make:filament-widget)';
  static options: CommandOptions = {
    allowUnknownFlags: true,
    startApp: false,
  };

  @args.string({ description: 'Widget name (e.g. ProductStats or ProductStatsWidget)' })
  declare name: string;

  @flags.string({
    description: `Widget kind (${WIDGET_KINDS.join(', ')})`,
    default: 'stats',
  })
  declare type: string;

  @flags.string({
    description: 'Panel id (directory under app/widgets/)',
    default: 'admin',
  })
  declare panel: string;

  @flags.number({
    description: 'Widget sort order on the dashboard',
    default: 10,
  })
  declare sort: number;

  @flags.boolean({
    description: 'Overwrite the file if it already exists',
    alias: 'f',
  })
  declare force: boolean;

  async run() {
    const kind = this.type.toLowerCase();
    if (!WIDGET_KINDS.includes(kind as (typeof WIDGET_KINDS)[number])) {
      this.logger.error(`Invalid widget type "${this.type}". Use one of: ${WIDGET_KINDS.join(', ')}`);
      this.exitCode = 1;
      return;
    }

    const parts = parseWidgetName(this.name, kind);
    const importPath = `#widgets/${this.panel}/${parts.fileName.replace(/\.ts$/, '')}`;
    const relativePath = `app/widgets/${this.panel}/${parts.fileName}`;

    await scaffoldFromStub(
      this,
      parts.stub,
      {
        entity: this.app.generators.createEntity(this.name),
        panel: this.panel,
        fileName: parts.fileName,
        className: parts.className,
        label: parts.label,
        sort: this.sort,
        flags: this.parsed.flags,
      },
      { force: this.force },
    );

    this.logger.success(`Created widget ${parts.className}`);
    this.logger.info(`  ${relativePath}`);
    this.logger.info('Add the widget to your dashboard page:');
    this.logger.info(`  import { ${parts.className} } from '${importPath}'`);
    this.logger.info(`  // static override widgets() { return [${parts.className}, …] }`);
  }
}
