/** Shared currency options for form fields, table columns, and infolist entries. */
export interface CurrencyOptions {
  code: string;
  locale?: string;
  /** Fraction digits (default 2). */
  precision?: number;
}

export type CurrencyInput = string | CurrencyOptions;

export function normalizeCurrencyOptions(
  codeOrOptions: CurrencyInput = 'USD',
  options?: Omit<CurrencyOptions, 'code'>,
): CurrencyOptions {
  if (typeof codeOrOptions === 'object' && codeOrOptions) {
    return {
      code: codeOrOptions.code || 'USD',
      locale: codeOrOptions.locale,
      precision: codeOrOptions.precision ?? 2,
    };
  }
  return {
    code: codeOrOptions || 'USD',
    locale: options?.locale,
    precision: options?.precision ?? 2,
  };
}

export function currencySymbol(code: string, locale?: string): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    return parts.find((part) => part.type === 'currency')?.value ?? code;
  } catch {
    return code;
  }
}

/**
 * Format a numeric value as currency for tables / entries.
 * Returns null when the value is blank or not a finite number.
 */
export function formatCurrencyValue(
  value: unknown,
  currency: CurrencyOptions,
): string | null {
  if (value == null || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return null;

  const precision = currency.precision ?? 2;
  try {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code || 'USD',
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(num);
  } catch {
    const symbol = currencySymbol(currency.code || 'USD', currency.locale);
    return `${symbol}${num.toFixed(precision)}`;
  }
}
