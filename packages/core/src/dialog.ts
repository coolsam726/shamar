import type { DialogPresentation, ResourcePageMode } from './types.js';

/** True when create/edit/view should open in a Shamar dialog (not a full page). */
export function isDialogPageMode(mode?: ResourcePageMode | string | null): boolean {
  return mode === 'modal' || mode === 'sidebar' || mode === 'fullscreen';
}

/** Normalize a page/action mode to a dialog presentation (defaults to modal). */
export function dialogPresentation(
  mode?: ResourcePageMode | DialogPresentation | string | null,
): DialogPresentation {
  if (mode === 'sidebar' || mode === 'fullscreen' || mode === 'modal') return mode;
  return 'modal';
}
