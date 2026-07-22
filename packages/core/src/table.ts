import type { ColumnConfig, FieldType, SortDirection, TableSchema } from './types.js';
import {
  normalizeCurrencyOptions,
  type CurrencyInput,
  type CurrencyOptions,
} from './currency.js';
import type { Alignment, VerticalAlignment } from './alignment.js';

/**
 * Filament `TextColumn::make('name')`.
 */
export class TextColumn {
  private config: ColumnConfig;

  private constructor(name: string) {
    this.config = { name, type: 'text' };
  }

  static make(name: string): TextColumn {
    return new TextColumn(name);
  }

  label(value: string): this {
    this.config.label = value;
    return this;
  }

  searchable(value = true): this {
    this.config.searchable = value;
    return this;
  }

  sortable(value = true): this {
    this.config.sortable = value;
    return this;
  }

  boolean(): this {
    this.config.type = 'boolean';
    this.config.format = 'boolean';
    return this;
  }

  toggle(): this {
    this.config.type = 'boolean';
    this.config.format = 'toggle';
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

  /**
   * Format the column value as currency (Intl).
   * Defaults alignment to end when unset.
   * @example TextColumn.make('price').currency('USD').sortable()
   */
  currency(
    codeOrOptions: CurrencyInput = 'USD',
    options?: Omit<CurrencyOptions, 'code'>,
  ): this {
    this.config.type = 'number';
    this.config.format = 'currency';
    this.config.currency = normalizeCurrencyOptions(codeOrOptions, options);
    if (this.config.alignment == null) {
      this.config.alignment = 'end';
    }
    return this;
  }

  email(): this {
    this.config.type = 'email';
    return this;
  }

  id(): this {
    this.config.type = 'id';
    return this;
  }

  /** Filament `alignment(Alignment::…)`. */
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

  /** Alias for LTR left. */
  alignLeft(): this {
    return this.alignment('left');
  }

  /** Alias for LTR right. */
  alignRight(): this {
    return this.alignment('right');
  }

  /** Filament `verticalAlignment(…)`. */
  verticalAlignment(value: VerticalAlignment): this {
    this.config.verticalAlignment = value;
    return this;
  }

  verticallyAlignStart(): this {
    return this.verticalAlignment('start');
  }

  verticallyAlignCenter(): this {
    return this.verticalAlignment('center');
  }

  verticallyAlignEnd(): this {
    return this.verticalAlignment('end');
  }

  /** @internal */
  build(): ColumnConfig {
    return { ...this.config };
  }
}

/**
 * Table root — same child pattern as form/infolist: `.schema([...])`.
 * (Avoids clashing with layout `.columns(n)` on Section / Fieldset.)
 */
export class TableBuilder {
  private columnList: TextColumn[] = [];
  private sort?: { field: string; direction: SortDirection };

  schema(cols: TextColumn[]): this {
    this.columnList = [...cols];
    return this;
  }

  defaultSort(field: string, direction: SortDirection = 'desc'): this {
    this.sort = { field, direction };
    return this;
  }

  build(): TableSchema {
    return {
      columns: this.columnList.map((c) => c.build()),
      defaultSort: this.sort,
    };
  }
}

export function table(callback: (builder: TableBuilder) => void): TableSchema {
  const builder = new TableBuilder();
  callback(builder);
  return builder.build();
}

export function columnTypeLabel(type: FieldType): string {
  return type;
}
