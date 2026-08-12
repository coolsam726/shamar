import { FormComponent, form } from './form.js';
import type { FieldConfig, FieldOption, FormSchema } from './types.js';
import type { SchemaItem } from './schemas.js';

function widgetOf(field: { widget?: Record<string, unknown> } | FieldConfig): Record<string, unknown> {
  return field.widget ?? {};
}

export function repeaterSchema(field: { widget?: Record<string, unknown> }): FormSchema | undefined {
  const schema = widgetOf(field).schema as FormSchema | undefined;
  if (schema && Array.isArray(schema.fields) && Array.isArray(schema.schema)) {
    return schema;
  }
  return undefined;
}

export function widgetFlag(field: { widget?: Record<string, unknown> }, key: string, fallback = false): boolean {
  const value = widgetOf(field)[key];
  return typeof value === 'boolean' ? value : fallback;
}

export function widgetString(field: { widget?: Record<string, unknown> }, key: string, fallback = ''): string {
  const value = widgetOf(field)[key];
  return typeof value === 'string' ? value : fallback;
}

export function widgetNumber(field: { widget?: Record<string, unknown> }, key: string): number | undefined {
  const value = widgetOf(field)[key];
  return typeof value === 'number' ? value : undefined;
}

export function widgetStringList(field: { widget?: Record<string, unknown> }, key: string): string[] {
  const value = widgetOf(field)[key];
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

/** Filament `TimePicker::make()`. */
export class TimePicker extends FormComponent {
  static make(name: string): TimePicker {
    return new TimePicker(name);
  }

  private constructor(name: string) {
    super(name, 'time');
  }

  seconds(value = true): this {
    this.config.step = value ? 1 : 60;
    return this.setWidget({ seconds: value });
  }

  /**
   * Display clock format. Stored values remain 24-hour (`HH:mm` / `HH:mm:ss`).
   * Omit to follow the browser locale.
   */
  timeFormat(value: '12' | '24'): this {
    return this.setWidget({ timeFormat: value });
  }

  hours12(): this {
    return this.timeFormat('12');
  }

  hours24(): this {
    return this.timeFormat('24');
  }

  /** Minute nudge step in the stepper popover (default 5, or 1 when seconds are enabled). */
  minuteStep(value: number): this {
    return this.setWidget({ minuteStep: Math.max(1, Math.min(30, Math.floor(value) || 1)) });
  }

  /** Use the browser's native time input instead of the Shamar picker. */
  native(value = true): this {
    return this.setWidget({ native: value });
  }
}

/** TipTap HTML editor. State is an HTML string. */
export class RichEditor extends FormComponent {
  static make(name: string): RichEditor {
    return new RichEditor(name);
  }

  private constructor(name: string) {
    super(name, 'richEditor');
    this.setWidget({ editorMode: 'simple' });
  }

  /**
   * Editor chrome:
   * - `simple` — TipTap Simple Editor–style fixed toolbar (default)
   * - `notion` — slash commands + bubble toolbar
   * - `document` — Word/Docx-style page chrome
   */
  mode(value: 'simple' | 'notion' | 'document'): this {
    const next =
      value === 'document' ? 'document' : value === 'notion' ? 'notion' : 'simple';
    return this.setWidget({ editorMode: next });
  }

  simple(): this {
    return this.mode('simple');
  }

  notion(): this {
    return this.mode('notion');
  }

  document(): this {
    return this.mode('document');
  }

  /** Alias for `.document()` (Docx-style chrome). */
  docx(): this {
    return this.mode('document');
  }

  toolbar(buttons: string[]): this {
    return this.setWidget({ toolbar: [...buttons] });
  }
}

/** Markdown source editor with preview. State is a markdown string. */
export class MarkdownEditor extends FormComponent {
  static make(name: string): MarkdownEditor {
    return new MarkdownEditor(name);
  }

  private constructor(name: string) {
    super(name, 'markdownEditor');
  }

  toolbar(buttons: string[]): this {
    return this.setWidget({ toolbar: [...buttons] });
  }
}

/** CodeMirror editor. State is a source string. */
export class CodeEditor extends FormComponent {
  static make(name: string): CodeEditor {
    return new CodeEditor(name);
  }

  private constructor(name: string) {
    super(name, 'codeEditor');
  }

  language(value: string): this {
    return this.setWidget({ language: value });
  }

  languages(values: string[]): this {
    return this.setWidget({ languages: [...values] });
  }
}

/** Repeatable nested form. State is an array of records. */
export class Repeater extends FormComponent {
  static make(name: string): Repeater {
    return new Repeater(name);
  }

  private constructor(name: string) {
    super(name, 'repeater');
    this.setWidget({
      schema: form(() => undefined),
      reorderable: true,
      addable: true,
      deletable: true,
    });
  }

  schema(children: SchemaItem[]): this {
    const nested = form((f) => {
      f.columns(2);
      f.schema(children);
    });
    return this.setWidget({ schema: nested });
  }

  minItems(value: number): this {
    return this.setWidget({ minItems: value });
  }

  maxItems(value: number): this {
    return this.setWidget({ maxItems: value });
  }

  reorderable(value = true): this {
    return this.setWidget({ reorderable: value });
  }

  addable(value = true): this {
    return this.setWidget({ addable: value });
  }

  deletable(value = true): this {
    return this.setWidget({ deletable: value });
  }

  itemLabel(value: string): this {
    return this.setWidget({ itemLabel: value });
  }

  addActionLabel(value: string): this {
    return this.setWidget({ addActionLabel: value });
  }

  defaultItems(value: number): this {
    return this.setWidget({ defaultItems: value });
  }
}

/**
 * Key/value editor. Alpine state is `{ key, value }[]`; payloads dehydrate to a record.
 */
export class KeyValue extends FormComponent {
  static make(name: string): KeyValue {
    return new KeyValue(name);
  }

  private constructor(name: string) {
    super(name, 'keyValue');
    this.setWidget({ reorderable: true });
  }

  keyLabel(value: string): this {
    return this.setWidget({ keyLabel: value });
  }

  valueLabel(value: string): this {
    return this.setWidget({ valueLabel: value });
  }

  reorderable(value = true): this {
    return this.setWidget({ reorderable: value });
  }
}

/** Range input. State is a number. */
export class Slider extends FormComponent {
  static make(name: string): Slider {
    return new Slider(name);
  }

  private constructor(name: string) {
    super(name, 'slider');
    this.config.minValue = 0;
    this.config.maxValue = 100;
    this.config.step = 1;
    this.setWidget({ showValue: true });
  }

  showValue(value = true): this {
    return this.setWidget({ showValue: value });
  }
}

/** Star rating. State is a number from 0..maxValue (default 5). */
export class Rating extends FormComponent {
  static make(name: string): Rating {
    return new Rating(name);
  }

  private constructor(name: string) {
    super(name, 'rating');
    this.config.minValue = 0;
    this.config.maxValue = 5;
    this.config.step = 1;
    this.setWidget({ allowZero: true });
  }

  allowZero(value = true): this {
    return this.setWidget({ allowZero: value });
  }
}

/** Radio (or checkbox list when `.multiple()`) rendered as toggle buttons. */
export class ToggleButtons extends FormComponent {
  static make(name: string): ToggleButtons {
    return new ToggleButtons(name);
  }

  private constructor(name: string) {
    super(name, 'radio');
    this.config.display = 'buttons';
    this.config.options = [];
  }

  options(entries: FieldOption[]): this {
    this.config.options = entries;
    return this;
  }

  grouped(value = true): this {
    return this.setWidget({ grouped: value });
  }

  colors(value = true): this {
    return this.setWidget({ colors: value });
  }

  multiple(value = true): this {
    this.config.multiple = value;
    this.config.type = value ? 'checkboxList' : 'radio';
    this.config.display = 'buttons';
    return this;
  }
}
