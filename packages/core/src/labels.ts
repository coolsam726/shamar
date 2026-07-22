/**
 * Turn a field name into a human label.
 * `startsAt` → `Starts At`, `starts_at` → `Starts At`, `SKU` → `SKU`.
 */
export function humanizeLabel(name: string): string {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) return '';

  const spaced = trimmed
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return spaced
    .split(' ')
    .map((word) => {
      if (!word) return word;
      if (/^[A-Z0-9]{2,}$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
