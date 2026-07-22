import type {
  ColumnSpan,
  FieldConfig,
  FieldType,
  InfolistEntryConfig,
  InfolistSchema,
  InfolistSectionConfig,
  SchemaNode,
} from './types.js';
import {
  buildSchemaNodes,
  collectEntries,
  Section,
  type SchemaItem,
} from './schemas.js';

/**
 * Shared base for infolist entries.
 */
abstract class InfolistEntry {
  /** Shared schema leaf marker (Filament 5 schemas). */
  readonly _schemaLeaf = 'entry' as const;

  protected config: InfolistEntryConfig;

  protected constructor(name: string, type: InfolistEntryConfig['type'] = 'text') {
    this.config = { name, type };
  }

  label(value: string): this {
    this.config.label = value;
    return this;
  }

  help(value: string): this {
    this.config.help = value;
    return this;
  }

  helperText(value: string): this {
    return this.help(value);
  }

  hint(value: string): this {
    this.config.hint = value;
    return this;
  }

  columnSpan(value: ColumnSpan): this {
    this.config.columnSpan = value;
    return this;
  }

  colspan(value: ColumnSpan): this {
    return this.columnSpan(value);
  }

  columnSpanFull(): this {
    this.config.columnSpan = 'full';
    return this;
  }

  colspanFull(): this {
    return this.columnSpanFull();
  }

  columnStart(value: number): this {
    this.config.columnStart = value;
    return this;
  }

  hiddenOnDetail(value = true): this {
    this.config.hiddenOnDetail = value;
    return this;
  }

  /** @internal */
  build(): InfolistEntryConfig {
    return { ...this.config };
  }
}

/**
 * Filament `TextEntry::make('name')`.
 */
export class TextEntry extends InfolistEntry {
  private constructor(name: string) {
    super(name, 'text');
  }

  static make(name: string): TextEntry {
    return new TextEntry(name);
  }

  boolean(): this {
    this.config.type = 'boolean';
    this.config.format = 'boolean';
    return this;
  }

  badge(): this {
    this.config.format = 'badge';
    return this;
  }

  date(): this {
    this.config.type = 'date';
    this.config.format = 'date';
    return this;
  }

  dateTime(): this {
    this.config.type = 'datetime';
    this.config.format = 'datetime';
    return this;
  }

  email(): this {
    this.config.type = 'email';
    this.config.url = true;
    return this;
  }

  url(value: boolean | string = true): this {
    this.config.url = value;
    return this;
  }

  copyable(value = true): this {
    this.config.copyable = value;
    return this;
  }

  markdown(value = true): this {
    if (value) this.config.format = 'markdown';
    return this;
  }
}

/** Filament `IconEntry::make()`. */
export class IconEntry extends InfolistEntry {
  private constructor(name: string) {
    super(name, 'icon');
    this.config.format = 'boolean';
  }

  static make(name: string): IconEntry {
    return new IconEntry(name);
  }

  boolean(): this {
    this.config.format = 'boolean';
    return this;
  }

  icon(value: string): this {
    this.config.icon = value;
    return this;
  }

  falseIcon(value: string): this {
    this.config.falseIcon = value;
    return this;
  }
}

/** Filament `ColorEntry::make()`. */
export class ColorEntry extends InfolistEntry {
  private constructor(name: string) {
    super(name, 'color');
  }

  static make(name: string): ColorEntry {
    return new ColorEntry(name);
  }
}

/** Filament `ImageEntry::make()`. */
export class ImageEntry extends InfolistEntry {
  private constructor(name: string) {
    super(name, 'image');
  }

  static make(name: string): ImageEntry {
    return new ImageEntry(name);
  }
}

export type InfolistSchemaItem = SchemaItem;

/**
 * @deprecated Use shared `Section` (Filament 5 schemas). Alias kept for compatibility.
 */
export const InfolistSection = Section;

/**
 * Infolist root — `$infolist->columns(3)->schema([...])`.
 */
export class InfolistBuilder {
  private rootColumns: 1 | 2 | 3 | 4 = 2;
  private children: InfolistSchemaItem[] = [];

  columns(value: 1 | 2 | 3 | 4): this {
    this.rootColumns = value;
    return this;
  }

  schema(children: InfolistSchemaItem[]): this {
    this.children = [...children];
    return this;
  }

  build(): InfolistSchema {
    let schema: SchemaNode[] = buildSchemaNodes(this.children);

    const onlyLeaves =
      schema.length > 0 && schema.every((n) => n.kind === 'field' || n.kind === 'entry');
    if (onlyLeaves || schema.length === 0) {
      schema = [
        {
          kind: 'plain',
          name: '_entries',
          title: '',
          columns: this.rootColumns,
          children: schema.filter((n) => n.kind === 'entry'),
        },
      ];
    }

    const entries = collectEntries(schema);
    const sections: InfolistSectionConfig[] = schema.map((node) => {
      if (node.kind === 'section' || node.kind === 'fieldset' || node.kind === 'plain') {
        return {
          name: node.name ?? 'section',
          title: node.title ?? '',
          description: node.description,
          icon: node.icon,
          kind: node.kind === 'fieldset' ? 'fieldset' : node.kind === 'plain' ? 'plain' : 'section',
          card: node.card,
          columns: node.columns,
          entries: collectEntries([node]),
          collapsible: node.collapsible,
          collapsed: node.collapsed,
          dense: node.dense,
          gap: node.gap,
          extraAttributes: node.extraAttributes,
        };
      }
      return {
        name: node.name ?? 'layout',
        title: node.title ?? '',
        description: node.description,
        icon: node.icon,
        kind: 'section' as const,
        card: node.card,
        columns: node.columns ?? this.rootColumns,
        entries: collectEntries([node]),
        collapsible: node.collapsible,
        collapsed: node.collapsed,
        dense: node.dense,
        gap: node.gap,
        extraAttributes: node.extraAttributes,
      };
    });

    return { schema, sections, entries };
  }
}

export function infolist(callback: (builder: InfolistBuilder) => void): InfolistSchema {
  const builder = new InfolistBuilder();
  callback(builder);
  return builder.build();
}

export function infolistFromFields(fields: FieldConfig[]): InfolistSchema {
  return infolist((i) => {
    i.columns(2).schema(
      fields
        .filter((field) => !field.hiddenOnDetail)
        .map((field) => {
          const entry = TextEntry.make(field.name).label(String(field.label ?? field.name));
          const type = field.type as FieldType;
          if (type === 'boolean' || type === 'checkbox') entry.boolean();
          else if (type === 'email') entry.email();
          else if (type === 'date') entry.date();
          else if (type === 'datetime') entry.dateTime();
          else if (type === 'color') {
            /* keep text; ColorEntry used explicitly */
          }
          return entry;
        }),
    );
  });
}
