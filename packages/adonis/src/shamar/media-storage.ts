import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile, access } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { constants as fsConstants } from 'node:fs';

/**
 * Blob storage for the media library. Local filesystem by default;
 * hosts can supply a Drive-backed implementation via config.
 */
export interface MediaStorage {
  readonly disk: string;
  put(key: string, contents: Buffer | Uint8Array): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /**
   * Absolute filesystem path when available (local disk), otherwise null.
   * Used for streaming downloads.
   */
  absolutePath?(key: string): string | null;
}

export interface LocalMediaStorageOptions {
  disk?: string;
  /** Absolute or cwd-relative root directory. */
  root: string;
}

export function createLocalMediaStorage(options: LocalMediaStorageOptions): MediaStorage {
  const disk = options.disk?.trim() || 'shamar';
  const root = resolve(options.root);

  function resolveKey(key: string): string {
    const normalized = key.replace(/^\/+/, '').replace(/\0/g, '');
    if (!normalized || normalized.includes('..')) {
      throw new Error('Invalid media storage key');
    }
    const full = resolve(root, normalized);
    const rel = relative(root, full);
    if (rel.startsWith('..') || rel === '') {
      // empty relative only if full === root; keys must be files under root
      if (full === root) throw new Error('Invalid media storage key');
    }
    if (rel.startsWith('..')) throw new Error('Invalid media storage key');
    return full;
  }

  return {
    disk,
    absolutePath(key) {
      return resolveKey(key);
    },
    async put(key, contents) {
      const full = resolveKey(key);
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, contents);
    },
    async get(key) {
      return readFile(resolveKey(key));
    },
    async delete(key) {
      try {
        await unlink(resolveKey(key));
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== 'ENOENT') throw error;
      }
    },
    async exists(key) {
      try {
        await access(resolveKey(key), fsConstants.F_OK);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export function mediaObjectKey(folderId: string | null | undefined, filename: string): string {
  const safeName = sanitizeFilename(filename);
  const id = randomUUID();
  const prefix = folderId ? `folders/${folderId}` : 'root';
  return `${prefix}/${id}-${safeName}`;
}

export function sanitizeFilename(name: string): string {
  const base = name.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'file';
  return base.slice(0, 180);
}

export function checksumOf(buffer: Buffer | Uint8Array): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function isImageMime(mime: string): boolean {
  return mime.toLowerCase().startsWith('image/');
}

/** True for image MIME types or common image extensions (incl. SVG). */
export function isImageLike(input: { mime?: string | null; name?: string | null }): boolean {
  const mime = String(input.mime ?? '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  const name = String(input.name ?? '').toLowerCase();
  return /\.(avif|gif|jpe?g|png|svg|webp|bmp|ico)$/i.test(name);
}

/** Prefer a concrete MIME when the browser sends a generic type. */
export function resolveUploadMime(clientName: string, reportedMime?: string | null): string {
  const reported = String(reportedMime ?? '').trim().toLowerCase();
  if (reported && reported !== 'application/octet-stream') {
    return reported;
  }
  if (/\.svg$/i.test(clientName)) return 'image/svg+xml';
  if (/\.png$/i.test(clientName)) return 'image/png';
  if (/\.jpe?g$/i.test(clientName)) return 'image/jpeg';
  if (/\.webp$/i.test(clientName)) return 'image/webp';
  if (/\.gif$/i.test(clientName)) return 'image/gif';
  return reported || 'application/octet-stream';
}
