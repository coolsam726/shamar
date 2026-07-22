import type {
  BoolOrClosure,
  FieldConfig,
  FieldType,
  FormSchema,
  FormSection,
  LiveMode,
  StringOrClosure,
  UniqueOptions,
  UnknownOrClosure,
  FieldContext,
  ColumnSpan,
} from './types.js';
import { isLayoutComponent, type SchemaItem } from './schemas.js';

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

  /**
   * Re-evaluate form state while typing (Filament-style).
   *
   * @example
   * TextInput.make('name').live()
   * TextInput.make('name').live({ debounce: '750ms' })
   * TextInput.make('name').live({ onBlur: true })
   */
  live(mode: LiveMode = true): this {
    this.config.live = mode;
    return this;
  }

  afterStateUpdated(callback: (ctx: FieldContext) => void | Promise<void>): this {
    this.config.afterStateUpdated = callback;
    return this;
  }

  /**
   * Require the value to be unique on the resource model.
   *
   * @example
   * TextInput.make('code').unique()
   * TextInput.make('code').unique({ ignoreRecord: true })
   * TextInput.make('email').unique({ column: 'email', message: 'Email already used' })
   */
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

  numeric(): this {
    this.config.type = 'number';
    return this;
  }

  integer(): this {
    return this.numeric();
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
}

/** Filament `Toggle::make()` / Checkbox. */
export class Toggle extends FormComponent {
  static make(name: string): Toggle {
    return new Toggle(name);
  }

  private constructor(name: string) {
    super(name, 'boolean');
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
}

/** Filament `DateTimePicker::make()`. */
export class DateTimePicker extends FormComponent {
  static make(name: string): DateTimePicker {
    return new DateTimePicker(name);
  }

  private constructor(name: string) {
    super(name, 'datetime');
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
    const sections: FormSection[] = [];
    const loose: FieldConfig[] = [];

    for (const child of this.children) {
      if (isLayoutComponent(child)) {
        sections.push(child.buildFormSection());
      } else if (child._schemaLeaf === 'field') {
        loose.push(child.build() as FieldConfig);
      }
      // Infolist entries nested in a form schema are ignored for form state.
    }

    if (loose.length > 0) {
      sections.push({
        name: '_fields',
        title: '',
        kind: 'plain',
        columns: this.rootColumns,
        fields: loose,
      });
    }

    if (sections.length === 0) {
      sections.push({
        name: '_fields',
        title: '',
        kind: 'plain',
        columns: this.rootColumns,
        fields: [],
      });
    }

    const fields = sections.flatMap((s) => s.fields);
    const seen = new Set<string>();
    const unique = fields.filter((f) => {
      if (seen.has(f.name)) return false;
      seen.add(f.name);
      return true;
    });

    return { sections, fields: unique };
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
