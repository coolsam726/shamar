/** Known Tailwind `max-w-*` tokens we emit as classes (safe for CSS purge). */
const TAILWIND_TOKENS = new Set([
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  'full',
  'none',
  'prose',
  'screen',
]);

export interface ContentMaxWidthResolved {
  /** Tailwind class such as `max-w-5xl` or `max-w-none`. */
  className: string;
  /** Inline `max-width: …` when a CSS length was provided. */
  style?: string;
}

/**
 * Resolve panel/resource `contentMaxWidth` for form + show layouts.
 *
 * Accepts:
 * - Tailwind token: `3xl`, `5xl`, `7xl`, `full`, `none`
 * - Full class: `max-w-5xl`
 * - CSS length: `80rem`, `1200px`, `90%`
 *
 * Default: `5xl` (64rem).
 */
export function resolveContentMaxWidth(value?: string | null): ContentMaxWidthResolved {
  const raw = (value ?? '5xl').trim();
  if (!raw) return { className: 'max-w-5xl' };

  if (raw.startsWith('max-w-')) {
    return { className: raw };
  }

  if (TAILWIND_TOKENS.has(raw)) {
    return { className: raw === 'none' ? 'max-w-none' : `max-w-${raw}` };
  }

  return { className: 'w-full max-w-none', style: `max-width: ${raw}` };
}
