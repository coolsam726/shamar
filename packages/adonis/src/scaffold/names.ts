function capitalize(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** `product_catalog` → `ProductCatalog` */
export function toPascalCase(input: string): string {
  return input
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[-_\s/]+/)
    .filter(Boolean)
    .map((part) => capitalize(part.replace(/[^a-zA-Z0-9]/g, '')))
    .join('');
}

/** `ProductCatalog` → `product_catalog` */
export function toSnakeCase(input: string): string {
  return toPascalCase(input)
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/** `ProductCatalog` → `product-catalog` */
export function toKebabCase(input: string): string {
  return toSnakeCase(input).replace(/_/g, '-');
}

/** Simple English plural for resource slugs / labels. */
export function pluralize(word: string): string {
  const lower = word.toLowerCase();
  if (lower.endsWith('y') && !/[aeiou]y$/i.test(lower)) {
    return word.slice(0, -1) + 'ies';
  }
  if (/(s|x|z|ch|sh)$/i.test(lower)) {
    return word + 'es';
  }
  return word + 's';
}

function stripSuffix(input: string, suffix: string): string {
  const re = new RegExp(`${suffix}$`, 'i');
  return input.replace(re, '');
}

export function parseWidgetName(input: string, kind: string) {
  const baseName = toPascalCase(stripSuffix(input.trim(), 'Widget'));
  const className = `${baseName}Widget`;
  const fileName = `${toSnakeCase(baseName)}_widget.ts`;
  const label = baseName.replace(/([A-Z])/g, ' $1').trim() || baseName;
  const stubByKind: Record<string, string> = {
    stats: 'widget/stats_widget.stub',
    list: 'widget/list_widget.stub',
    chart: 'widget/chart_widget.stub',
    card: 'widget/card_widget.stub',
  };
  return {
    baseName,
    className,
    fileName,
    label,
    stub: stubByKind[kind] ?? stubByKind.stats!,
  };
}
