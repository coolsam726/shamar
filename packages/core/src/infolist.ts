import type {
  ColumnSpan,
  FieldConfig,
  FieldType,
  InfolistEntryConfig,
  InfolistSchema,
  InfolistSectionConfig,
} from './types.js';
import { isLayoutComponent, Section, type SchemaItem } from './schemas.js';

/**
 * Filament `TextEntry::make('name')` — entry chains are isolated.
 */
export class TextEntry {
  /** Shared schema leaf marker (Filament 5 schemas). */
  readonly _schemaLeaf = 'entry' as const;

  private config: InfolistEntryConfig;

  private constructor(name: string) {
    this.config = { name, type: 'text' };
  }

  static make(name: string): TextEntry {
    return new TextEntry(name);
  }

  label(value: string): this {
    this.config.label = value;
    return this;
  }

  /** Helper text below the value. Alias: `helperText()`. */
  help(value: string): this {
    this.config.help = value;
    return this;
  }

  /** Filament-style alias for `help()`. */
  helperText(value: string): this {
    return this.help(value);
  }

  /** Short text beside the label. */
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
    return this;
  }

  /** @internal */
  build(): InfolistEntryConfig {
    return { ...this.config };
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
    const sections: InfolistSectionConfig[] = [];
    const loose: InfolistEntryConfig[] = [];

    for (const child of this.children) {
      if (isLayoutComponent(child)) {
        sections.push(child.buildInfolistSection());
      } else if (child._schemaLeaf === 'entry') {
        loose.push(child.build() as InfolistEntryConfig);
      }
      // Form fields nested in an infolist schema are ignored for detail view.
    }

    if (loose.length > 0) {
      sections.push({
        name: '_entries',
        title: '',
        kind: 'plain',
        columns: this.rootColumns,
        entries: loose,
      });
    }

    if (sections.length === 0) {
      sections.push({
        name: '_entries',
        title: '',
        kind: 'plain',
        columns: this.rootColumns,
        entries: [],
      });
    }

    const entries = sections.flatMap((s) => s.entries);
    const seen = new Set<string>();
    const unique = entries.filter((e) => {
      if (seen.has(e.name)) return false;
      seen.add(e.name);
      return true;
    });

    return { sections, entries: unique };
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
          if (type === 'boolean') entry.boolean();
          else if (type === 'email') entry.email();
          else if (type === 'date') entry.date();
          else if (type === 'datetime') entry.dateTime();
          return entry;
        }),
    );
  });
}
