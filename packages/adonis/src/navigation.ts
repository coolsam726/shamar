/**
 * Local value re-exports of `@shamar/core` navigation helpers.
 *
 * JetBrains IDEs often fail to resolve static members on dual const+type symbols
 * when they are only re-exported via `export { NavigationType } from '@shamar/core'`.
 * Assigning the const locally makes `NavigationType.APP` / `.SIDE` / … autocomplete work
 * for `import { NavigationType } from '@shamar/adonis'`.
 */
import {
  NavigationType as NavigationTypeConst,
  normalizeNavigationType,
  normalizeSideNavMode,
} from '@shamar/core'
import type {
  NavigationType as NavigationTypeName,
  NavigationTypeInput,
  SideNavMode,
  SideNavModeInput,
} from '@shamar/core'

export const NavigationType = NavigationTypeConst
export type NavigationType = NavigationTypeName
export { normalizeNavigationType, normalizeSideNavMode }
export type { NavigationTypeInput, SideNavMode, SideNavModeInput }
