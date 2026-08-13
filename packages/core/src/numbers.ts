/**
 * Format large numbers for dashboard stats (e.g. 1284500 → "1.3M").
 * Uses {@link Intl.NumberFormat} compact notation.
 */
export function formatCompactNumber(
  value: number,
  options?: {
    locale?: string;
    /** Max fraction digits for compact form (default 1). */
    maximumFractionDigits?: number;
  },
): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(options?.locale ?? 'en', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: options?.maximumFractionDigits ?? 1,
  }).format(value);
}
