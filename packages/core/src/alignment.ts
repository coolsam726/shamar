/** Filament-style horizontal alignment. */
export type Alignment = 'start' | 'center' | 'end' | 'left' | 'right' | 'justify';

/** Filament-style vertical alignment (table cells). */
export type VerticalAlignment = 'start' | 'center' | 'end';

/** Map alignment to Tailwind text-align utilities. */
export function alignmentTextClass(alignment?: Alignment | null): string {
  switch (alignment) {
    case 'center':
      return 'text-center';
    case 'end':
    case 'right':
      return 'text-right';
    case 'justify':
      return 'text-justify';
    case 'start':
    case 'left':
    default:
      return 'text-left';
  }
}

/** Map vertical alignment to Tailwind vertical-align utilities (table cells). */
export function verticalAlignmentClass(
  alignment?: VerticalAlignment | null,
): string {
  switch (alignment) {
    case 'start':
      return 'align-top';
    case 'end':
      return 'align-bottom';
    case 'center':
    default:
      return 'align-middle';
  }
}

export function resolveAlignmentClass(options: {
  alignment?: Alignment | null;
  verticalAlignment?: VerticalAlignment | null;
}): string {
  return [alignmentTextClass(options.alignment), verticalAlignmentClass(options.verticalAlignment)]
    .filter(Boolean)
    .join(' ');
}
