import type {
  FieldConfig,
  FormSection,
  InfolistEntryConfig,
  InfolistSectionConfig,
  SchemaNode,
  CalloutStatus,
  ColumnSpan,
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

/** Anything that can appear in a schema() array. */
export type SchemaItem = LayoutComponent | SchemaLeaf;

let untitledLayoutSeq = 0;

function slugifyTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, '_');
}

function nextLayoutName(prefix: string): string {
  untitledLayoutSeq += 1;
  return `${prefix}_${untitledLayoutSeq}`;
}

function isSchemaLeaf(item: SchemaItem): item is SchemaLeaf {
  return !(item instanceof LayoutComponent) && '_schemaLeaf' in item;
}

/** Walk a schema tree and collect field configs (deduped). */
export function collectFields(nodes: SchemaNode[]): FieldConfig[] {
  const out: FieldConfig[] = [];
  const seen = new Set<string>();

  const walk = (list: SchemaNode[]) => {
    for (const node of list) {
      if (node.kind === 'field' && node.field) {
        if (!seen.has(node.field.name)) {
          seen.add(node.field.name);
          out.push(node.field);
        }
      }
      if (node.children?.length) walk(node.children);
    }
  };

  walk(nodes);
  return out;
}

/** Walk a schema tree and collect entry configs (deduped). */
export function collectEntries(nodes: SchemaNode[]): InfolistEntryConfig[] {
  const out: InfolistEntryConfig[] = [];
  const seen = new Set<string>();

  const walk = (list: SchemaNode[]) => {
    for (const node of list) {
      if (node.kind === 'entry' && node.entry) {
        if (!seen.has(node.entry.name)) {
          seen.add(node.entry.name);
          out.push(node.entry);
        }
      }
      if (node.children?.length) walk(node.children);
    }
  };

  walk(nodes);
  return out;
}

function childToNode(child: SchemaItem): SchemaNode | null {
  if (child instanceof LayoutComponent) {
    return child.buildNode();
  }
  if (isSchemaLeaf(child)) {
    if (child._schemaLeaf === 'field') {
      const field = child.build() as FieldConfig;
      return {
        kind: 'field',
        name: field.name,
        columnSpan: field.columnSpan,
        columnStart: field.columnStart,
        field,
      };
    }
    const entry = child.build() as InfolistEntryConfig;
    return {
      kind: 'entry',
      name: entry.name,
      columnSpan: entry.columnSpan,
      columnStart: entry.columnStart,
      entry,
    };
  }
  return null;
}

function buildChildren(children: SchemaItem[]): SchemaNode[] {
  return children.map(childToNode).filter((n): n is SchemaNode => n != null);
}

/**
 * Base for Filament schema layout components.
 */
abstract class LayoutComponent {
  protected sectionColumns: 1 | 2 | 3 | 4 = 2;
  protected descriptionText?: string;
  protected iconName?: string;
  protected cardEnabled?: boolean;
  protected denseEnabled?: boolean;
  protected gapEnabled = true;
  protected collapsibleEnabled?: boolean;
  protected collapsedEnabled?: boolean;
  protected growEnabled?: boolean;
  protected fromBreakpoint?: string;
  protected statusValue?: CalloutStatus;
  protected contentText?: string;
  protected badgeValue?: string | number;
  protected activeTabIndex?: number;
  protected verticalEnabled?: boolean;
  protected columnSpanValue?: ColumnSpan;
  protected columnStartValue?: number;
  protected extraAttrs?: Record<string, string>;
  protected children: SchemaItem[] = [];
  protected name: string;
  protected title: string;
  protected abstract readonly kind: SchemaNode['kind'];

  protected constructor(title?: string, name?: string) {
    this.title = title?.trim() ?? '';
    if (name) {
      this.name = name;
    } else if (this.title) {
      this.name = slugifyTitle(this.title);
    } else {
      this.name = nextLayoutName('layout');
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
   * Defaults: Section → card, Fieldset → transparent, Tabs → card.
   */
  card(value = true): this {
    this.cardEnabled = value;
    return this;
  }

  /** Filament-style alias: contained(false) ≈ card(false). */
  contained(value = true): this {
    return this.card(value);
  }

  dense(value = true): this {
    this.denseEnabled = value;
    return this;
  }

  gap(value = true): this {
    this.gapEnabled = value;
    return this;
  }

  collapsible(value = true): this {
    this.collapsibleEnabled = value;
    return this;
  }

  collapsed(value = true): this {
    this.collapsedEnabled = value;
    if (value) this.collapsibleEnabled = true;
    return this;
  }

  grow(value = true): this {
    this.growEnabled = value;
    return this;
  }

  from(breakpoint: string): this {
    this.fromBreakpoint = breakpoint;
    return this;
  }

  columnSpan(value: ColumnSpan): this {
    this.columnSpanValue = value;
    return this;
  }

  columnSpanFull(): this {
    this.columnSpanValue = 'full';
    return this;
  }

  columnStart(value: number): this {
    this.columnStartValue = value;
    return this;
  }

  extraAttributes(attrs: Record<string, string>, options?: { merge?: boolean }): this {
    this.extraAttrs = options?.merge
      ? { ...this.extraAttrs, ...attrs }
      : { ...attrs };
    return this;
  }

  schema(children: SchemaItem[]): this {
    this.children = [...children];
    return this;
  }

  protected defaultCard(): boolean {
    return this.kind === 'section' || this.kind === 'tabs' || this.kind === 'callout';
  }

  /** @internal Build nested SchemaNode (does not flatten chrome). */
  buildNode(): SchemaNode {
    return {
      kind: this.kind,
      name: this.name,
      title: this.title || undefined,
      description: this.descriptionText,
      icon: this.iconName,
      card: this.cardEnabled ?? this.defaultCard(),
      columns: this.sectionColumns,
      dense: this.denseEnabled,
      gap: this.gapEnabled,
      collapsible: this.collapsibleEnabled,
      collapsed: this.collapsedEnabled,
      grow: this.growEnabled,
      from: this.fromBreakpoint,
      status: this.statusValue,
      content: this.contentText,
      badge: this.badgeValue,
      activeTab: this.activeTabIndex,
      vertical: this.verticalEnabled,
      columnSpan: this.columnSpanValue,
      columnStart: this.columnStartValue,
      extraAttributes: this.extraAttrs,
      children: buildChildren(this.children),
    };
  }

  /** @deprecated Prefer buildNode + collectFields. Kept for FormSection BC. */
  buildFormSection(): FormSection {
    const node = this.buildNode();
    return {
      name: node.name ?? 'section',
      title: node.title ?? '',
      description: node.description,
      icon: node.icon,
      kind:
        node.kind === 'fieldset'
          ? 'fieldset'
          : node.kind === 'plain'
            ? 'plain'
            : 'section',
      card: node.card,
      columns: node.columns,
      fields: collectFields([node]),
      collapsible: node.collapsible,
      collapsed: node.collapsed,
      dense: node.dense,
      gap: node.gap,
      extraAttributes: node.extraAttributes,
    };
  }

  /** @deprecated Prefer buildNode + collectEntries. Kept for InfolistSection BC. */
  buildInfolistSection(): InfolistSectionConfig {
    const node = this.buildNode();
    return {
      name: node.name ?? 'section',
      title: node.title ?? '',
      description: node.description,
      icon: node.icon,
      kind:
        node.kind === 'fieldset'
          ? 'fieldset'
          : node.kind === 'plain'
            ? 'plain'
            : 'section',
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
}

export { LayoutComponent };

/**
 * Filament `Schemas\Components\Section::make()` / `Section::make('Title')`.
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
 */
export class Fieldset extends LayoutComponent {
  protected readonly kind = 'fieldset' as const;

  static make(title?: string): Fieldset {
    return new Fieldset(title);
  }

  protected override defaultCard(): boolean {
    return false;
  }
}

/**
 * Filament `Schemas\Components\Grid::make()`.
 */
export class Grid extends LayoutComponent {
  protected readonly kind = 'grid' as const;

  static make(columns: 1 | 2 | 3 | 4 = 2): Grid {
    const grid = new Grid();
    grid.sectionColumns = columns;
    return grid;
  }

  protected override defaultCard(): boolean {
    return false;
  }
}

/**
 * Filament-style unstyled group wrapper.
 */
export class Group extends LayoutComponent {
  protected readonly kind = 'group' as const;

  static make(): Group {
    return new Group();
  }

  protected override defaultCard(): boolean {
    return false;
  }
}

/**
 * Filament `Schemas\Components\Flex`.
 */
export class Flex extends LayoutComponent {
  protected readonly kind = 'flex' as const;

  static make(children?: SchemaItem[]): Flex {
    const flex = new Flex();
    if (children) flex.children = [...children];
    flex.fromBreakpoint = 'md';
    return flex;
  }

  protected override defaultCard(): boolean {
    return false;
  }
}

/**
 * Filament `Schemas\Components\Tabs\Tab`.
 */
export class Tab extends LayoutComponent {
  protected readonly kind = 'tab' as const;

  static make(title: string): Tab {
    return new Tab(title);
  }

  icon(value: string): this {
    this.iconName = value;
    return this;
  }

  badge(value: string | number): this {
    this.badgeValue = value;
    return this;
  }

  protected override defaultCard(): boolean {
    return false;
  }
}

/**
 * Filament `Schemas\Components\Tabs`.
 */
export class Tabs extends LayoutComponent {
  protected readonly kind = 'tabs' as const;

  static make(title?: string): Tabs {
    return new Tabs(title);
  }

  tabs(items: Tab[]): this {
    this.children = [...items];
    return this;
  }

  activeTab(index: number): this {
    this.activeTabIndex = index;
    return this;
  }

  vertical(value = true): this {
    this.verticalEnabled = value;
    return this;
  }

  protected override defaultCard(): boolean {
    return true;
  }
}

/**
 * Filament `Schemas\Components\Wizard\Step`.
 */
export class Step extends LayoutComponent {
  protected readonly kind = 'step' as const;

  static make(title: string): Step {
    return new Step(title);
  }

  icon(value: string): this {
    this.iconName = value;
    return this;
  }

  protected override defaultCard(): boolean {
    return false;
  }
}

/**
 * Filament `Schemas\Components\Wizard` (UI-only; no per-step validation yet).
 */
export class Wizard extends LayoutComponent {
  protected readonly kind = 'wizard' as const;

  static make(steps?: Step[]): Wizard {
    const wizard = new Wizard();
    if (steps) wizard.children = [...steps];
    return wizard;
  }

  steps(items: Step[]): this {
    this.children = [...items];
    return this;
  }

  protected override defaultCard(): boolean {
    return true;
  }
}

/**
 * Filament `Schemas\Components\Callout`.
 */
export class Callout extends LayoutComponent {
  protected readonly kind = 'callout' as const;

  static make(title?: string): Callout {
    const callout = new Callout(title);
    callout.statusValue = 'info';
    return callout;
  }

  icon(value: string): this {
    this.iconName = value;
    return this;
  }

  info(): this {
    this.statusValue = 'info';
    return this;
  }

  success(): this {
    this.statusValue = 'success';
    return this;
  }

  warning(): this {
    this.statusValue = 'warning';
    return this;
  }

  danger(): this {
    this.statusValue = 'danger';
    return this;
  }

  protected override defaultCard(): boolean {
    return true;
  }

  override buildNode(): SchemaNode {
    const node = super.buildNode();
    // Description doubles as body when no nested schema.
    if (!node.content && node.description && (!node.children || node.children.length === 0)) {
      node.content = node.description;
    }
    return node;
  }
}

/**
 * Filament empty state block.
 */
export class EmptyState extends LayoutComponent {
  protected readonly kind = 'empty_state' as const;

  static make(heading?: string): EmptyState {
    return new EmptyState(heading);
  }

  icon(value: string): this {
    this.iconName = value;
    return this;
  }

  protected override defaultCard(): boolean {
    return false;
  }
}

/**
 * Filament-style Placeholder / static content in a schema.
 */
export class Placeholder extends LayoutComponent {
  protected readonly kind = 'placeholder' as const;

  static make(name: string): Placeholder {
    return new Placeholder(undefined, name);
  }

  label(value: string): this {
    this.title = value;
    return this;
  }

  content(value: string): this {
    this.contentText = value;
    return this;
  }

  protected override defaultCard(): boolean {
    return false;
  }
}

export function isLayoutComponent(item: SchemaItem): item is LayoutComponent {
  return item instanceof LayoutComponent;
}

/** Convert a SchemaItem list into root SchemaNode[]. */
export function buildSchemaNodes(items: SchemaItem[]): SchemaNode[] {
  return buildChildren(items);
}
