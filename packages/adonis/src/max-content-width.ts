/**
 * Local value re-exports of `@shamar/core` max-content-width helpers.
 *
 * JetBrains IDEs often fail to resolve static members on dual const+type symbols
 * when they are only re-exported via `export { MaxWidth } from '@shamar/core'`.
 * Assigning the const locally makes `MaxWidth.Sm` / `.ScreenLg` / `.Prose` / …
 * autocomplete work for `import { MaxWidth } from '@shamar/adonis'`.
 */
import {
  MaxWidth as MaxWidthConst,
  MaxContentWidth as MaxContentWidthConst,
  normalizeMaxContentWidth,
  normalizeMaxWidth,
  resolveContentMaxWidth,
  resolveMaxWidth,
  DEFAULT_CONTENT_MAX_WIDTH,
  MAX_CONTENT_WIDTH_ALIASES,
} from '@shamar/core'
import type {
  MaxWidthToken,
  MaxWidthInput,
  MaxContentWidthToken,
  MaxContentWidthInput,
  ContentMaxWidthResolved,
} from '@shamar/core'

export const MaxWidth = MaxWidthConst
export type MaxWidth = MaxWidthToken

/** @deprecated Prefer {@link MaxWidth}. */
export const MaxContentWidth = MaxContentWidthConst
/** @deprecated Prefer {@link MaxWidth}. */
export type MaxContentWidth = MaxContentWidthToken

export {
  normalizeMaxContentWidth,
  normalizeMaxWidth,
  resolveContentMaxWidth,
  resolveMaxWidth,
  DEFAULT_CONTENT_MAX_WIDTH,
  MAX_CONTENT_WIDTH_ALIASES,
}
export type {
  MaxWidthToken,
  MaxWidthInput,
  MaxContentWidthToken,
  MaxContentWidthInput,
  ContentMaxWidthResolved,
}
