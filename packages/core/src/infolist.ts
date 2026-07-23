import type {
  ColumnSpan,
  FieldConfig,
  FieldType,
  FormSchema,
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
import {
  normalizeCurrencyOptions,
  type CurrencyInput,
  type CurrencyOptions,
} from './currency.js';
import type { Alignment } from './alignment.js';

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

  /** Filament-style horizontal alignment of the entry value. */
  alignment(value: Alignment): this {
    this.config.alignment = value;
    return this;
  }

  alignStart(): this {
    return this.alignment('start');
  }

  alignCenter(): this {
    return this.alignment('center');
  }

  alignEnd(): this {
    return this.alignment('end');
  }

  alignJustify(): this {
    return this.alignment('justify');
  }

  alignLeft(): this {
    return this.alignment('left');
  }

  alignRight(): this {
    return this.alignment('right');
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

  /**
   * Long / unbroken text display (payloads, tokens, hex dumps).
   * Renders in a scrollable block with `overflow-wrap` / `break-all`.
   */
  textarea(value = true): this {
    if (value) {
      this.config.type = 'textarea';
      this.config.format = 'textarea';
    }
    return this;
  }

  /**
   * Format the entry value as currency (Intl).
   * @example TextEntry.make('price').currency('USD')
   */
  currency(
    codeOrOptions: CurrencyInput = 'USD',
    options?: Omit<CurrencyOptions, 'code'>,
  ): this {
    this.config.type = 'number';
    this.config.format = 'currency';
    this.config.currency = normalizeCurrencyOptions(codeOrOptions, options);
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
      // Card section by default (Filament-style) — not transparent `plain`.
      schema = [
        {
          kind: 'section',
          name: '_entries',
          title: '',
          card: true,
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

/**
 * Map a form field to an infolist entry (shared heuristics for derived show schemas).
 */
export function fieldConfigToEntry(field: FieldConfig): InfolistEntryConfig {
  const entry = TextEntry.make(field.name).label(String(field.label ?? field.name));
  if (typeof field.help === 'string') entry.help(field.help);
  if (typeof field.hint === 'string') entry.hint(field.hint);
  if (field.columnSpan != null) entry.columnSpan(field.columnSpan);
  if (field.columnStart != null) entry.columnStart(field.columnStart);
  if (field.alignment) entry.alignment(field.alignment);

  const type = field.type as FieldType;
  if (type === 'relationTable' || field.relation?.kind === 'hasMany') {
    entry.columnSpanFull();
  } else if (type === 'boolean' || type === 'checkbox') entry.boolean();
  else if (type === 'email') entry.email();
  else if (type === 'date') entry.date();
  else if (type === 'datetime') entry.dateTime();
  else if (type === 'textarea') entry.textarea().columnSpanFull();
  else if (type === 'tags') entry.badge();

  return entry.build();
}

function mapFormNodesToInfolist(nodes: SchemaNode[]): SchemaNode[] {
  const out: SchemaNode[] = [];

  for (const node of nodes) {
    if (node.kind === 'field') {
      const field = node.field;
      if (!field || field.hiddenOnDetail) continue;
      if (field.type === 'password' || field.type === 'hidden') continue;
      const entry = fieldConfigToEntry(field);
      out.push({
        kind: 'entry',
        name: entry.name,
        columnSpan: entry.columnSpan ?? node.columnSpan,
        columnStart: entry.columnStart ?? node.columnStart,
        entry,
      });
      continue;
    }

    if (node.kind === 'entry') {
      if (node.entry?.hiddenOnDetail) continue;
      out.push({ ...node });
      continue;
    }

    const children = node.children?.length ? mapFormNodesToInfolist(node.children) : [];
    // Drop empty layout chrome (e.g. section whose only fields were hiddenOnDetail).
    if (!children.length && (node.kind === 'section' || node.kind === 'fieldset' || node.kind === 'plain' || node.kind === 'grid' || node.kind === 'group' || node.kind === 'flex' || node.kind === 'tab' || node.kind === 'step')) {
      continue;
    }

    out.push({
      ...node,
      field: undefined,
      entry: undefined,
      children,
    });
  }

  return out;
}

function finalizeInfolistSchema(schema: SchemaNode[], rootColumns: 1 | 2 | 3 | 4 = 2): InfolistSchema {
  let next = schema;
  const onlyLeaves =
    next.length > 0 && next.every((n) => n.kind === 'field' || n.kind === 'entry');
  if (onlyLeaves || next.length === 0) {
    next = [
      {
        kind: 'section',
        name: '_entries',
        title: '',
        card: true,
        columns: rootColumns,
        children: next.filter((n) => n.kind === 'entry'),
      },
    ];
  }

  const entries = collectEntries(next);
  const sections: InfolistSectionConfig[] = next.map((node) => {
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
      columns: node.columns ?? rootColumns,
      entries: collectEntries([node]),
      collapsible: node.collapsible,
      collapsed: node.collapsed,
      dense: node.dense,
      gap: node.gap,
      extraAttributes: node.extraAttributes,
    };
  });

  return { schema: next, sections, entries };
}

/**
 * Derive an infolist from the form **schema tree**, preserving Sections / Grids /
 * Tabs / Fieldsets and per-node column spans. Field leaves become entries.
 */
export function formSchemaToInfolistSchema(form: FormSchema): InfolistSchema {
  if (!form.schema?.length) {
    return infolistFromFields(form.fields);
  }
  const mapped = mapFormNodesToInfolist(form.schema);
  if (!mapped.length) {
    return infolistFromFields(form.fields);
  }
  return finalizeInfolistSchema(mapped);
}

export function infolistFromFields(fields: FieldConfig[]): InfolistSchema {
  return finalizeInfolistSchema(
    fields
      .filter((field) => !field.hiddenOnDetail)
      .filter((field) => field.type !== 'password' && field.type !== 'hidden')
      .map((field) => {
        const entry = fieldConfigToEntry(field);
        return {
          kind: 'entry' as const,
          name: entry.name,
          columnSpan: entry.columnSpan,
          columnStart: entry.columnStart,
          entry,
        };
      }),
  );
}
