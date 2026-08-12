import type { MediaFile, MediaFolder, MediaLibraryAdapter, MediaVisibility } from '@shamar/core';
import type { ShamarHttpContext } from '../context.js';
import type { MediaStorage } from '../shamar/media-storage.js';
import {
  checksumOf,
  isImageLike,
  isImageMime,
  mediaObjectKey,
  resolveUploadMime,
  sanitizeFilename,
} from '../shamar/media-storage.js';
import { normalizeMediaVisibility, resolveMediaFileUrl } from '../shamar/media-url.js';

export interface MediaControllerOptions {
  adapter: MediaLibraryAdapter;
  storage: MediaStorage;
  basePath: string;
  /** Ungated public media path prefix (default `/media`). */
  publicPath?: string;
  /**
   * When false, skip ability checks (host uses panel auth only).
   * Default: require media.view / media.upload / media.manage.
   */
  checkAbility?: (
    ctx: ShamarHttpContext,
    ability: 'view' | 'upload' | 'manage',
  ) => boolean | Promise<boolean>;
}

function jsonError(ctx: ShamarHttpContext, status: number, message: string) {
  return ctx.response.status(status).json({ message });
}

function serializeFile(
  file: MediaFile,
  options: { basePath: string; publicPath: string },
) {
  return {
    ...file,
    visibility: normalizeMediaVisibility(file.visibility),
    url: resolveMediaFileUrl(file, {
      panelBasePath: options.basePath,
      publicPath: options.publicPath,
    }),
    isImage: isImageMime(file.mime) || isImageLike(file),
  };
}

function publicFolder(folder: MediaFolder) {
  return folder;
}

export class MediaController {
  constructor(private readonly options: MediaControllerOptions) {}

  private get adapter() {
    return this.options.adapter;
  }

  private get storage() {
    return this.options.storage;
  }

  private get basePath() {
    return this.options.basePath.replace(/\/+$/, '') || '/admin';
  }

  private get publicPath() {
    return (this.options.publicPath ?? '/media').replace(/\/+$/, '') || '/media';
  }

  private filePayload(file: MediaFile) {
    return serializeFile(file, { basePath: this.basePath, publicPath: this.publicPath });
  }

  private async allow(
    ctx: ShamarHttpContext,
    ability: 'view' | 'upload' | 'manage',
  ): Promise<boolean> {
    if (!this.options.checkAbility) return true;
    return this.options.checkAbility(ctx, ability);
  }

  private async streamFile(ctx: ShamarHttpContext, file: MediaFile) {
    const abs = this.storage.absolutePath?.(file.key);
    if (abs && typeof ctx.response.download === 'function') {
      ctx.response.header('Content-Type', file.mime);
      ctx.response.header(
        'Cache-Control',
        file.visibility === 'public' ? 'public, max-age=86400' : 'private',
      );
      return ctx.response.download(abs);
    }

    const buffer = await this.storage.get(file.key);
    ctx.response.header('Content-Type', file.mime);
    ctx.response.header('Content-Length', String(buffer.byteLength));
    ctx.response.header(
      'Cache-Control',
      file.visibility === 'public' ? 'public, max-age=86400' : 'private',
    );
    return ctx.response.send(buffer);
  }

  /** GET — browse folders/files (HTML page or JSON). */
  async index(ctx: ShamarHttpContext) {
    if (!(await this.allow(ctx, 'view'))) {
      return jsonError(ctx, 403, 'Forbidden');
    }

    const folderId = (ctx.request.qs().folderId as string | undefined) || null;
    const search = (ctx.request.qs().q as string | undefined) || undefined;
    const mimePrefix = (ctx.request.qs().mime as string | undefined) || undefined;
    const globalSearch =
      ctx.request.qs().global === '1' ||
      ctx.request.qs().scope === 'library' ||
      Boolean(search && ctx.request.qs().global !== '0');
    const asJson =
      ctx.request.qs().format === 'json' ||
      ctx.request.header('accept')?.includes('application/json');

    const browse = await this.adapter.browse({
      folderId: globalSearch && search ? null : folderId,
      search,
      mimePrefix,
      globalSearch: Boolean(globalSearch && search),
    });

    const payload = {
      folder: browse.folder ? publicFolder(browse.folder) : null,
      breadcrumbs: browse.breadcrumbs.map(publicFolder),
      folders: browse.folders.map(publicFolder),
      files: browse.files.map((file) => this.filePayload(file)),
      searching: Boolean(globalSearch && search),
      basePath: this.basePath,
      publicPath: this.publicPath,
      mediaApiBase: `${this.basePath}/media`,
    };

    if (asJson) {
      return ctx.response.json(payload);
    }

    const folderTree = await this.adapter.listFolders();
    return ctx.view.render('shamar::media/manager', {
      ...payload,
      folderTree: folderTree.map(publicFolder),
      mediaBreadcrumbs: payload.breadcrumbs,
      pageTitle: 'Files',
    });
  }

  async browseJson(ctx: ShamarHttpContext) {
    ctx.request.updateQs({ ...ctx.request.qs(), format: 'json' });
    return this.index(ctx);
  }

  async listFolders(ctx: ShamarHttpContext) {
    if (!(await this.allow(ctx, 'view'))) {
      return jsonError(ctx, 403, 'Forbidden');
    }
    const folders = await this.adapter.listFolders();
    return ctx.response.json({ folders: folders.map(publicFolder) });
  }

  async createFolder(ctx: ShamarHttpContext) {
    if (!(await this.allow(ctx, 'manage'))) {
      return jsonError(ctx, 403, 'Forbidden');
    }
    const body = ctx.request.body() as { name?: string; parentId?: string | null };
    const name = String(body.name ?? '').trim();
    if (!name) return jsonError(ctx, 422, 'Folder name is required');
    try {
      const folder = await this.adapter.createFolder({
        name,
        parentId: body.parentId ?? null,
      });
      return ctx.response.status(201).json({ folder: publicFolder(folder) });
    } catch (error) {
      return jsonError(ctx, 400, error instanceof Error ? error.message : 'Unable to create folder');
    }
  }

  async renameFolder(ctx: ShamarHttpContext) {
    if (!(await this.allow(ctx, 'manage'))) {
      return jsonError(ctx, 403, 'Forbidden');
    }
    const id = String(ctx.params.id ?? '');
    const name = String((ctx.request.body() as { name?: string }).name ?? '').trim();
    if (!name) return jsonError(ctx, 422, 'Folder name is required');
    try {
      const folder = await this.adapter.renameFolder(id, { name });
      return ctx.response.json({ folder: publicFolder(folder) });
    } catch (error) {
      return jsonError(ctx, 400, error instanceof Error ? error.message : 'Unable to rename folder');
    }
  }

  async moveFolder(ctx: ShamarHttpContext) {
    if (!(await this.allow(ctx, 'manage'))) {
      return jsonError(ctx, 403, 'Forbidden');
    }
    const id = String(ctx.params.id ?? '');
    const folderId = (ctx.request.body() as { folderId?: string | null }).folderId ?? null;
    try {
      const folder = await this.adapter.moveFolder(id, { folderId });
      return ctx.response.json({ folder: publicFolder(folder) });
    } catch (error) {
      return jsonError(ctx, 400, error instanceof Error ? error.message : 'Unable to move folder');
    }
  }

  async deleteFolder(ctx: ShamarHttpContext) {
    if (!(await this.allow(ctx, 'manage'))) {
      return jsonError(ctx, 403, 'Forbidden');
    }
    const id = String(ctx.params.id ?? '');
    try {
      const { files } = await this.adapter.deleteFolder(id);
      await Promise.all(
        files.map(async (file) => {
          try {
            await this.storage.delete(file.key);
          } catch {
            /* ignore missing blobs */
          }
        }),
      );
      return ctx.response.json({ ok: true, deletedFiles: files.length });
    } catch (error) {
      return jsonError(ctx, 400, error instanceof Error ? error.message : 'Unable to delete folder');
    }
  }

  async upload(ctx: ShamarHttpContext) {
    if (!(await this.allow(ctx, 'upload'))) {
      return jsonError(ctx, 403, 'Forbidden');
    }

    const folderIdRaw = ctx.request.input('folderId');
    const folderId =
      folderIdRaw == null || folderIdRaw === '' ? null : String(folderIdRaw);
    const visibilityRaw = String(ctx.request.input('visibility') ?? 'private');
    const visibility: MediaVisibility = visibilityRaw === 'public' ? 'public' : 'private';

    const uploaded = ctx.request.file('file', {
      size: '50mb',
    });

    const files =
      typeof ctx.request.files === 'function'
        ? ctx.request.files('file')
        : uploaded
          ? [uploaded]
          : [];

    const list = Array.isArray(files) ? files : files ? [files] : [];
    if (!list.length && uploaded) list.push(uploaded);
    if (!list.length) return jsonError(ctx, 422, 'No file uploaded');

    const created: ReturnType<MediaController['filePayload']>[] = [];

    for (const file of list) {
      if (!file) continue;
      const clientName = sanitizeFilename(
        String(file.clientName || file.fileName || 'upload'),
      );
      const mime = resolveUploadMime(
        clientName,
        String(file.type || file.headers?.['content-type'] || ''),
      );
      const tmpPath = file.tmpPath as string | undefined;

      let buffer: Buffer;
      if (tmpPath) {
        const { readFile } = await import('node:fs/promises');
        buffer = await readFile(tmpPath);
      } else {
        return jsonError(ctx, 422, `Unable to read upload: ${clientName}`);
      }

      const key = mediaObjectKey(folderId, clientName);
      await this.storage.put(key, buffer);
      const record = await this.adapter.createFile({
        folderId,
        name: clientName,
        disk: this.storage.disk,
        key,
        mime,
        size: buffer.byteLength,
        checksum: checksumOf(buffer),
        visibility,
      });
      created.push(this.filePayload(record));
    }

    return ctx.response.status(201).json({ files: created });
  }

  async renameFile(ctx: ShamarHttpContext) {
    if (!(await this.allow(ctx, 'manage'))) {
      return jsonError(ctx, 403, 'Forbidden');
    }
    const id = String(ctx.params.id ?? '');
    const name = String((ctx.request.body() as { name?: string }).name ?? '').trim();
    if (!name) return jsonError(ctx, 422, 'File name is required');
    try {
      const file = await this.adapter.renameFile(id, { name });
      return ctx.response.json({ file: this.filePayload(file) });
    } catch (error) {
      return jsonError(ctx, 400, error instanceof Error ? error.message : 'Unable to rename file');
    }
  }

  async moveFile(ctx: ShamarHttpContext) {
    if (!(await this.allow(ctx, 'manage'))) {
      return jsonError(ctx, 403, 'Forbidden');
    }
    const id = String(ctx.params.id ?? '');
    const folderId = (ctx.request.body() as { folderId?: string | null }).folderId ?? null;
    try {
      const file = await this.adapter.moveFile(id, { folderId });
      return ctx.response.json({ file: this.filePayload(file) });
    } catch (error) {
      return jsonError(ctx, 400, error instanceof Error ? error.message : 'Unable to move file');
    }
  }

  async setFileVisibility(ctx: ShamarHttpContext) {
    if (!(await this.allow(ctx, 'manage'))) {
      return jsonError(ctx, 403, 'Forbidden');
    }
    const id = String(ctx.params.id ?? '');
    const visibilityRaw = String(
      (ctx.request.body() as { visibility?: string }).visibility ?? '',
    ).trim();
    const visibility: MediaVisibility = visibilityRaw === 'public' ? 'public' : 'private';
    try {
      const file = await this.adapter.setFileVisibility(id, { visibility });
      return ctx.response.json({ file: this.filePayload(file) });
    } catch (error) {
      return jsonError(
        ctx,
        400,
        error instanceof Error ? error.message : 'Unable to update visibility',
      );
    }
  }

  async deleteFile(ctx: ShamarHttpContext) {
    if (!(await this.allow(ctx, 'manage'))) {
      return jsonError(ctx, 403, 'Forbidden');
    }
    const id = String(ctx.params.id ?? '');
    try {
      const file = await this.adapter.deleteFile(id);
      try {
        await this.storage.delete(file.key);
      } catch {
        /* ignore */
      }
      return ctx.response.json({ ok: true });
    } catch (error) {
      return jsonError(ctx, 400, error instanceof Error ? error.message : 'Unable to delete file');
    }
  }

  /** Duplicate a file into a target folder (copy/paste). */
  async copyFile(ctx: ShamarHttpContext) {
    if (!(await this.allow(ctx, 'upload'))) {
      return jsonError(ctx, 403, 'Forbidden');
    }
    const id = String(ctx.params.id ?? '');
    const folderIdRaw = (ctx.request.body() as { folderId?: string | null }).folderId;
    const folderId =
      folderIdRaw == null || folderIdRaw === '' ? null : String(folderIdRaw);

    const source = await this.adapter.getFile(id);
    if (!source) return jsonError(ctx, 404, 'Not found');

    try {
      const buffer = await this.storage.get(source.key);
      const key = mediaObjectKey(folderId, source.name);
      await this.storage.put(key, buffer);
      const record = await this.adapter.createFile({
        folderId,
        name: source.name,
        disk: this.storage.disk,
        key,
        mime: source.mime,
        size: buffer.byteLength,
        checksum: checksumOf(buffer),
        width: source.width ?? null,
        height: source.height ?? null,
        visibility: normalizeMediaVisibility(source.visibility),
      });
      return ctx.response.status(201).json({ file: this.filePayload(record) });
    } catch (error) {
      return jsonError(ctx, 400, error instanceof Error ? error.message : 'Unable to copy file');
    }
  }

  async showFile(ctx: ShamarHttpContext) {
    if (!(await this.allow(ctx, 'view'))) {
      return jsonError(ctx, 403, 'Forbidden');
    }
    const id = String(ctx.params.id ?? '');
    const file = await this.adapter.getFile(id);
    if (!file) return jsonError(ctx, 404, 'Not found');
    return ctx.response.json({ file: this.filePayload(file) });
  }

  /** Authenticated (or ability-gated) raw stream — works for private and public. */
  async rawFile(ctx: ShamarHttpContext) {
    if (!(await this.allow(ctx, 'view'))) {
      return jsonError(ctx, 403, 'Forbidden');
    }
    const id = String(ctx.params.id ?? '');
    const file = await this.adapter.getFile(id);
    if (!file) return jsonError(ctx, 404, 'Not found');
    return this.streamFile(ctx, file);
  }

  /**
   * Ungated raw stream for public files only.
   * Private files return 404 (do not reveal existence).
   */
  async publicRaw(ctx: ShamarHttpContext) {
    const id = String(ctx.params.id ?? '');
    const file = await this.adapter.getFile(id);
    if (!file || normalizeMediaVisibility(file.visibility) !== 'public') {
      return jsonError(ctx, 404, 'Not found');
    }
    return this.streamFile(ctx, file);
  }
}
