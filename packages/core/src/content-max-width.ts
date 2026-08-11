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
  'screen-sm',
  'screen-md',
  'screen-lg',
  'screen-xl',
  'screen-2xl',
]);

/**
 * Default max width for form and show pages when panel/resource omit `contentMaxWidth`.
 * Screen tokens map to breakpoint widths (container-like).
 */
export const DEFAULT_CONTENT_MAX_WIDTH = 'screen-xl';

export interface ContentMaxWidthResolved {
  /** Tailwind class such as `w-full max-w-screen-xl` or `max-w-none`. */
  className: string;
  /** Inline `max-width: …` when a CSS length was provided. */
  style?: string;
}

function classForToken(token: string): string {
  if (token === 'none') return 'w-full max-w-none';
  if (token === 'full') return 'w-full max-w-full';
  // Screen / scale tokens: fill the content column up to the cap.
  return `w-full max-w-${token}`;
}

/**
 * Resolve panel/resource `contentMaxWidth` for form + show layouts.
 *
 * Accepts:
 * - Screen (container) token: `screen-lg`, `screen-xl`, `screen-2xl`
 * - Scale token: `3xl`, `5xl`, `7xl`, `full`, `none`
 * - Full class: `max-w-screen-xl`
 * - CSS length: `80rem`, `1200px`, `90%`
 *
 * Default: `screen-xl` (1280px). Override per panel with `.contentMaxWidth('…')`
 * or per resource with `static contentMaxWidth = '…'`.
 */
export function resolveContentMaxWidth(value?: string | null): ContentMaxWidthResolved {
  const raw = (value ?? DEFAULT_CONTENT_MAX_WIDTH).trim();
  if (!raw) return { className: classForToken(DEFAULT_CONTENT_MAX_WIDTH) };

  if (raw.startsWith('max-w-')) {
    return { className: raw.includes('w-full') ? raw : `w-full ${raw}` };
  }

  if (TAILWIND_TOKENS.has(raw)) {
    return { className: classForToken(raw) };
  }

  return { className: 'w-full max-w-none', style: `max-width: ${raw}` };
}
