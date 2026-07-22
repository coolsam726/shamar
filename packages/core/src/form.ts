import type {
  BoolOrClosure,
  FieldConfig,
  FieldType,
  FormSchema,
  FormSection,
  LiveMode,
  SchemaNode,
  StringOrClosure,
  UniqueOptions,
  UnknownOrClosure,
  FieldContext,
  ColumnSpan,
} from './types.js';
import {
  buildSchemaNodes,
  collectFields,
  isLayoutComponent,
  type SchemaItem,
} from './schemas.js';
import {
  currencySymbol,
  normalizeCurrencyOptions,
  type CurrencyInput,
  type CurrencyOptions,
} from './currency.js';
import type { Alignment } from './alignment.js';

/**
 * Base for form field components (`TextInput::make()` style).
 * Field chains only expose field modifiers — never sibling factories.
 */
export abstract class FormComponent {
  /** Shared schema leaf marker (Filament 5 schemas). */
  readonly _schemaLeaf = 'field' as const;

  protected config: FieldConfig;

  protected constructor(name: string, type: FieldType) {
    this.config = { name, type };
  }

  label(value: StringOrClosure): this {
    this.config.label = value;
    return this;
  }

  required(value = true): this {
    this.config.required = value;
    return this;
  }

  searchable(value = true): this {
    this.config.searchable = value;
    return this;
  }

  placeholder(value: StringOrClosure): this {
    this.config.placeholder = value;
    return this;
  }

  /** Helper text below the field. Alias: `helperText()`. */
  help(value: StringOrClosure): this {
    this.config.help = value;
    return this;
  }

  /** Filament-style alias for `help()`. */
  helperText(value: StringOrClosure): this {
    return this.help(value);
  }

  /** Short text beside the label. */
  hint(value: StringOrClosure): this {
    this.config.hint = value;
    return this;
  }

  hiddenOnForm(value = true): this {
    this.config.hiddenOnForm = value;
    return this;
  }

  hiddenOnDetail(value = true): this {
    this.config.hiddenOnDetail = value;
    return this;
  }

  readonly(value = true): this {
    this.config.readonly = value;
    return this;
  }

  disabled(value: BoolOrClosure = true): this {
    this.config.disabled = value;
    return this;
  }

  visible(value: BoolOrClosure = true): this {
    this.config.visible = value;
    return this;
  }

  dehydrated(value = true): this {
    this.config.dehydrated = value;
    return this;
  }

  default(value: UnknownOrClosure): this {
    this.config.default = value;
    return this;
  }

  createOnly(value = true): this {
    this.config.createOnly = value;
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

  /** Filament-style horizontal alignment of the field control. */
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

  inline(value = true): this {
    this.config.inline = value;
    return this;
  }

  rows(value: number): this {
    this.config.rows = value;
    return this;
  }

  prefix(value: string): this {
    this.config.prefix = value;
    return this;
  }

  suffix(value: string): this {
    this.config.suffix = value;
    return this;
  }

  /** Filament-style: prefix inside (default) or outside the input border. */
  inlinePrefix(value = true): this {
    this.config.inlinePrefix = value;
    return this;
  }

  /** Filament-style: suffix inside (default) or outside the input border. */
  inlineSuffix(value = true): this {
    this.config.inlineSuffix = value;
    return this;
  }

  /** Set both prefix and suffix inline mode. */
  inlineAffixes(value = true): this {
    this.config.inlinePrefix = value;
    this.config.inlineSuffix = value;
    return this;
  }

  prefixIcon(value: string): this {
    this.config.prefixIcon = value;
    return this;
  }

  suffixIcon(value: string): this {
    this.config.suffixIcon = value;
    return this;
  }

  autocomplete(value: string): this {
    this.config.autocomplete = value;
    return this;
  }

  inputMode(value: string): this {
    this.config.inputMode = value;
    return this;
  }

  /** Exact string length (also sets minLength + maxLength). */
  length(value: number): this {
    this.config.length = value;
    this.config.minLength = value;
    this.config.maxLength = value;
    return this;
  }

  minLength(value: number): this {
    this.config.minLength = value;
    return this;
  }

  maxLength(value: number): this {
    this.config.maxLength = value;
    return this;
  }

  minValue(value: number | string): this {
    this.config.minValue = value;
    return this;
  }

  /** Filament alias for numeric/date lower bound. */
  min(value: number | string): this {
    return this.minValue(value);
  }

  maxValue(value: number | string): this {
    this.config.maxValue = value;
    return this;
  }

  /** Filament alias for numeric/date upper bound. */
  max(value: number | string): this {
    return this.maxValue(value);
  }

  step(value: number | string): this {
    this.config.step = value;
    return this;
  }

  /** HTML `pattern` + server-side RegExp check. */
  pattern(value: string): this {
    this.config.pattern = value;
    return this;
  }

  /** Alias for `pattern()`. */
  regex(value: string): this {
    return this.pattern(value);
  }

  copyable(value = true): this {
    this.config.copyable = value;
    return this;
  }

  datalist(values: string[]): this {
    this.config.datalist = [...values];
    return this;
  }

  extraInputAttributes(
    attrs: Record<string, string>,
    options?: { merge?: boolean },
  ): this {
    this.config.extraInputAttributes = options?.merge
      ? { ...this.config.extraInputAttributes, ...attrs }
      : { ...attrs };
    return this;
  }

  /**
   * Re-evaluate form state while typing (Filament-style).
   */
  live(mode: LiveMode = true): this {
    this.config.live = mode;
    return this;
  }

  afterStateUpdated(callback: (ctx: FieldContext) => void | Promise<void>): this {
    this.config.afterStateUpdated = callback;
    return this;
  }

  unique(options: boolean | UniqueOptions = true): this {
    this.config.unique = options;
    return this;
  }

  /** @internal */
  build(): FieldConfig {
    return { ...this.config };
  }
}

/** Filament `TextInput::make()`. */
export class TextInput extends FormComponent {
  static make(name: string): TextInput {
    return new TextInput(name);
  }

  private constructor(name: string) {
    super(name, 'text');
  }

  email(): this {
    this.config.type = 'email';
    return this;
  }

  password(): this {
    this.config.type = 'password';
    return this;
  }

  /** Filament `revealable()` — show/hide password toggle. */
  revealable(value = true): this {
    this.config.revealable = value;
    return this;
  }

  tel(): this {
    this.config.type = 'tel';
    this.config.inputMode = this.config.inputMode ?? 'tel';
    return this;
  }

  url(): this {
    this.config.type = 'url';
    return this;
  }

  numeric(): this {
    this.config.type = 'number';
    this.config.inputMode = this.config.inputMode ?? 'decimal';
    return this;
  }

  integer(): this {
    this.config.type = 'number';
    this.config.step = this.config.step ?? 1;
    this.config.inputMode = this.config.inputMode ?? 'numeric';
    return this;
  }

  /**
   * Format a numeric field as currency (display via Intl; value stays numeric).
   * Sets `numeric()` and a currency-symbol prefix when none is set.
   */
  currency(
    codeOrOptions: CurrencyInput = 'USD',
    options?: Omit<CurrencyOptions, 'code'>,
  ): this {
    this.numeric();
    const currency = normalizeCurrencyOptions(codeOrOptions, options);
    this.config.currency = currency;
    this.config.step = this.config.step ?? (currency.precision === 0 ? 1 : 0.01);
    if (this.config.prefix == null && this.config.prefixIcon == null) {
      this.config.prefix = currencySymbol(currency.code, currency.locale);
    }
    return this;
  }
}

/** Filament `Textarea::make()`. */
export class Textarea extends FormComponent {
  static make(name: string): Textarea {
    return new Textarea(name);
  }

  private constructor(name: string) {
    super(name, 'textarea');
  }
}

/** Filament `Select::make()`. */
export class Select extends FormComponent {
  static make(name: string): Select {
    return new Select(name);
  }

  private constructor(name: string) {
    super(name, 'select');
    this.config.options = [];
  }

  options(entries: Array<{ label: string; value: string | number }>): this {
    this.config.options = entries;
    return this;
  }

  multiple(value = true): this {
    this.config.multiple = value;
    return this;
  }

  /**
   * When `false`, omit the blank placeholder option (Filament `selectablePlaceholder(false)`).
   */
  selectablePlaceholder(value = true): this {
    this.config.selectablePlaceholder = value;
    return this;
  }

  /**
   * Use a native `<select>` instead of the Shamar combobox.
   * Useful for simple forms or when custom OS select behaviour is preferred.
   */
  native(value = true): this {
    this.config.nativeSelect = value;
    return this;
  }
}

/** Filament `Toggle::make()` — switch UI. */
export class Toggle extends FormComponent {
  static make(name: string): Toggle {
    return new Toggle(name);
  }

  private constructor(name: string) {
    super(name, 'boolean');
  }
}

/** Filament `Checkbox::make()` — native checkbox (distinct from Toggle). */
export class Checkbox extends FormComponent {
  static make(name: string): Checkbox {
    return new Checkbox(name);
  }

  private constructor(name: string) {
    super(name, 'checkbox');
  }
}

/** Filament `Radio::make()`. */
export class Radio extends FormComponent {
  static make(name: string): Radio {
    return new Radio(name);
  }

  private constructor(name: string) {
    super(name, 'radio');
    this.config.options = [];
  }

  options(entries: Array<{ label: string; value: string | number }>): this {
    this.config.options = entries;
    return this;
  }
}

/** Filament `Hidden::make()`. */
export class Hidden extends FormComponent {
  static make(name: string): Hidden {
    return new Hidden(name);
  }

  private constructor(name: string) {
    super(name, 'hidden');
  }
}

/** Filament `ColorPicker::make()`. */
export class ColorPicker extends FormComponent {
  static make(name: string): ColorPicker {
    return new ColorPicker(name);
  }

  private constructor(name: string) {
    super(name, 'color');
  }
}

/** Filament `TagsInput::make()` — state is `string[]`. */
export class TagsInput extends FormComponent {
  static make(name: string): TagsInput {
    return new TagsInput(name);
  }

  private constructor(name: string) {
    super(name, 'tags');
  }
}

/** Filament `DatePicker::make()`. */
export class DatePicker extends FormComponent {
  static make(name: string): DatePicker {
    return new DatePicker(name);
  }

  private constructor(name: string) {
    super(name, 'date');
  }

  minDate(value: string): this {
    return this.minValue(value);
  }

  maxDate(value: string): this {
    return this.maxValue(value);
  }
}

/** Filament `DateTimePicker::make()`. */
export class DateTimePicker extends FormComponent {
  static make(name: string): DateTimePicker {
    return new DateTimePicker(name);
  }

  private constructor(name: string) {
    super(name, 'datetime');
  }

  minDate(value: string): this {
    return this.minValue(value);
  }

  maxDate(value: string): this {
    return this.maxValue(value);
  }
}

/** Filament `FileUpload::make()`. */
export class FileUpload extends FormComponent {
  static make(name: string): FileUpload {
    return new FileUpload(name);
  }

  private constructor(name: string) {
    super(name, 'file');
  }

  image(): this {
    this.config.type = 'image';
    this.config.accept = this.config.accept ?? 'image/*';
    return this;
  }

  accept(value: string): this {
    this.config.accept = value;
    return this;
  }

  multiple(value = true): this {
    this.config.multiple = value;
    return this;
  }
}

export type FormSchemaItem = SchemaItem;

/**
 * Form root — Filament `$form->columns(2)->schema([...])`.
 */
export class FormBuilder {
  private rootColumns: 1 | 2 | 3 | 4 = 2;
  private children: FormSchemaItem[] = [];

  columns(value: 1 | 2 | 3 | 4): this {
    this.rootColumns = value;
    return this;
  }

  schema(children: FormSchemaItem[]): this {
    this.children = [...children];
    return this;
  }

  build(): FormSchema {
    let schema: SchemaNode[] = buildSchemaNodes(this.children);

    // Wrap bare fields in a plain container when only leaves at root.
    const onlyLeaves =
      schema.length > 0 && schema.every((n) => n.kind === 'field' || n.kind === 'entry');
    if (onlyLeaves || schema.length === 0) {
      schema = [
        {
          kind: 'plain',
          name: '_fields',
          title: '',
          columns: this.rootColumns,
          children: schema.filter((n) => n.kind === 'field'),
        },
      ];
    }

    const fields = collectFields(schema);
    const sections: FormSection[] = schema.map((node) => {
      if (node.kind === 'section' || node.kind === 'fieldset' || node.kind === 'plain') {
        return {
          name: node.name ?? 'section',
          title: node.title ?? '',
          description: node.description,
          icon: node.icon,
          kind: node.kind === 'fieldset' ? 'fieldset' : node.kind === 'plain' ? 'plain' : 'section',
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
      // Non-section root layouts still expose a synthetic section for BC consumers.
      return {
        name: node.name ?? 'layout',
        title: node.title ?? '',
        description: node.description,
        icon: node.icon,
        kind: 'section' as const,
        card: node.card,
        columns: node.columns ?? this.rootColumns,
        fields: collectFields([node]),
        collapsible: node.collapsible,
        collapsed: node.collapsed,
        dense: node.dense,
        gap: node.gap,
        extraAttributes: node.extraAttributes,
      };
    });

    return { schema, sections, fields };
  }
}

export function form(callback: (builder: FormBuilder) => void): FormSchema {
  const builder = new FormBuilder();
  callback(builder);
  return builder.build();
}

export function fieldTypeLabel(type: FieldType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
