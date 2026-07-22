import type {
  FieldConfig,
  FormSection,
  InfolistEntryConfig,
  InfolistSectionConfig,
} from './types.js';

/**
 * Filament 5 shared schema layout — used by both forms and infolists.
 * Leaves stay separate (`FormComponent` / `TextEntry`); chrome is shared.
 */

export type SchemaLeafKind = 'field' | 'entry';

/** Duck-typed leaf: form fields and infolist entries. */
export interface SchemaLeaf {
  readonly _schemaLeaf: SchemaLeafKind;
  build(): FieldConfig | InfolistEntryConfig;
}

export type SchemaItem = LayoutComponent | SchemaLeaf;

export interface LayoutBuild {
  name: string;
  title: string;
  description?: string;
  icon?: string;
  kind: 'section' | 'fieldset';
  card: boolean;
  columns: 1 | 2 | 3 | 4;
  fields: FieldConfig[];
  entries: InfolistEntryConfig[];
}

function isSchemaLeaf(item: SchemaItem): item is SchemaLeaf {
  return !(item instanceof LayoutComponent) && '_schemaLeaf' in item;
}

let untitledLayoutSeq = 0;

function slugifyTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, '_');
}

abstract class LayoutComponent {
  protected sectionColumns: 1 | 2 | 3 | 4 = 2;
  protected descriptionText?: string;
  protected iconName?: string;
  protected cardEnabled?: boolean;
  protected children: SchemaItem[] = [];
  protected name: string;
  protected title: string;
  protected abstract readonly kind: 'section' | 'fieldset';

  protected constructor(title?: string, name?: string) {
    this.title = title?.trim() ?? '';
    if (name) {
      this.name = name;
    } else if (this.title) {
      this.name = slugifyTitle(this.title);
    } else {
      untitledLayoutSeq += 1;
      this.name = `layout_${untitledLayoutSeq}`;
    }
  }

  columns(value: 1 | 2 | 3 | 4): this {
    this.sectionColumns = value;
    return this;
  }

  /** Set / replace the heading (Filament `heading()`). */
  heading(value: string): this {
    this.title = value.trim();
    if (this.name.startsWith('layout_') && this.title) {
      this.name = slugifyTitle(this.title);
    }
    return this;
  }

  description(value: string): this {
    this.descriptionText = value;
    return this;
  }

  /**
   * White elevated body (`true`) or transparent (`false`).
   * Defaults: Section → card, Fieldset → transparent.
   * (Filament Fieldset uses `contained()`; we keep `card()`.)
   */
  card(value = true): this {
    this.cardEnabled = value;
    return this;
  }

  /** Filament-style alias: contained(false) ≈ card(false). */
  contained(value = true): this {
    return this.card(value);
  }

  schema(children: SchemaItem[]): this {
    this.children = [...children];
    return this;
  }

  /** @internal Collect layout meta + leaf fields/entries (nested layouts flatten in). */
  buildLayout(): LayoutBuild {
    const fields: FieldConfig[] = [];
    const entries: InfolistEntryConfig[] = [];

    for (const child of this.children) {
      if (child instanceof LayoutComponent) {
        const nested = child.buildLayout();
        fields.push(...nested.fields);
        entries.push(...nested.entries);
      } else if (isSchemaLeaf(child)) {
        if (child._schemaLeaf === 'field') {
          fields.push(child.build() as FieldConfig);
        } else {
          entries.push(child.build() as InfolistEntryConfig);
        }
      }
    }

    return {
      name: this.name,
      title: this.title,
      description: this.descriptionText,
      icon: this.iconName,
      kind: this.kind,
      card: this.cardEnabled ?? this.kind === 'section',
      columns: this.sectionColumns,
      fields,
      entries,
    };
  }

  /** Form schema container (fields only). */
  buildFormSection(): FormSection {
    const layout = this.buildLayout();
    return {
      name: layout.name,
      title: layout.title,
      description: layout.description,
      icon: layout.icon,
      kind: layout.kind,
      card: layout.card,
      columns: layout.columns,
      fields: layout.fields,
    };
  }

  /** Infolist schema container (entries only). */
  buildInfolistSection(): InfolistSectionConfig {
    const layout = this.buildLayout();
    return {
      name: layout.name,
      title: layout.title,
      description: layout.description,
      icon: layout.icon,
      kind: layout.kind,
      card: layout.card,
      columns: layout.columns,
      entries: layout.entries,
    };
  }
}

export { LayoutComponent };

/**
 * Filament `Schemas\Components\Section::make()` / `Section::make('Title')`.
 * Omit title/icon/description to render a headerless card.
 */
export class Section extends LayoutComponent {
  protected readonly kind = 'section' as const;

  static make(title?: string): Section {
    return new Section(title);
  }

  icon(value: string): this {
    this.iconName = value;
    return this;
  }
}

/**
 * Filament `Schemas\Components\Fieldset::make('Label')`.
 * Legend is omitted when no title is set.
 */
export class Fieldset extends LayoutComponent {
  protected readonly kind = 'fieldset' as const;

  static make(title?: string): Fieldset {
    return new Fieldset(title);
  }
}

export function isLayoutComponent(item: SchemaItem): item is LayoutComponent {
  return item instanceof LayoutComponent;
}
