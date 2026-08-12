import type { MediaFile, MediaVisibility } from '@shamar/core';

export function normalizeMediaVisibility(value: unknown): MediaVisibility {
  return value === 'public' ? 'public' : 'private';
}

/**
 * Resolve the browser URL for a media file.
 * Public files use the ungated `publicPath/:id` route; private files stay behind panel auth.
 */
export function resolveMediaFileUrl(
  file: Pick<MediaFile, 'id' | 'visibility'>,
  options: { panelBasePath: string; publicPath?: string },
): string {
  const panelBase = options.panelBasePath.replace(/\/+$/, '') || '/admin';
  const publicBase = (options.publicPath ?? '/media').replace(/\/+$/, '') || '/media';
  if (normalizeMediaVisibility(file.visibility) === 'public') {
    return `${publicBase}/${file.id}`;
  }
  return `${panelBase}/media/files/${file.id}/raw`;
}

/** Convenience for building a public URL from an id (e.g. FilePicker → branding). */
export function mediaPublicUrl(id: string, publicPath = '/media'): string {
  const base = publicPath.replace(/\/+$/, '') || '/media';
  return `${base}/${String(id).trim()}`;
}
