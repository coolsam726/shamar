import type {
  MediaBrowseQuery,
  MediaBrowseResult,
  MediaCreateFileInput,
  MediaCreateFolderInput,
  MediaFile,
  MediaFolder,
  MediaLibraryAdapter,
  MediaMoveInput,
  MediaRenameInput,
} from '@shamar/core';

/**
 * Duck-typed Lucid model statics for media folders/files.
 */
export interface MediaLucidModel {
  query(): MediaLucidQuery;
  create(data: Record<string, unknown>): Promise<MediaLucidRow>;
  find(id: unknown): Promise<MediaLucidRow | null>;
  findOrFail(id: unknown): Promise<MediaLucidRow>;
}

export interface MediaLucidQuery {
  where(key: string, value: unknown): this;
  where(key: string, op: string, value: unknown): this;
  whereNull(key: string): this;
  whereIn(key: string, values: unknown[]): this;
  whereILike?(key: string, value: string): this;
  orderBy(field: string, direction: string): this;
  limit(value: number): this;
  first(): Promise<MediaLucidRow | null>;
  exec?(): Promise<MediaLucidRow[]>;
  then?: Promise<MediaLucidRow[]>['then'];
  delete(): Promise<unknown>;
}

export interface MediaLucidRow {
  id?: unknown;
  $attributes?: Record<string, unknown>;
  merge(data: Record<string, unknown>): this;
  save(): Promise<void>;
  delete(): Promise<void>;
  serialize(): Record<string, unknown>;
  toJSON(): Record<string, unknown>;
}

export interface LucidMediaLibraryOptions {
  Folder: MediaLucidModel;
  File: MediaLucidModel;
}

function toRecord(row: MediaLucidRow): Record<string, unknown> {
  if (typeof row.serialize === 'function') return row.serialize();
  if (typeof row.toJSON === 'function') return row.toJSON();
  return { ...(row.$attributes ?? {}), id: row.id };
}

function idOf(doc: Record<string, unknown>): string {
  return String(doc.id ?? doc._id ?? '');
}

function toFolder(doc: Record<string, unknown>): MediaFolder {
  return {
    id: idOf(doc),
    name: String(doc.name ?? ''),
    parentId: doc.parentId != null && doc.parentId !== '' ? String(doc.parentId) : null,
    createdAt: (doc.createdAt as string | Date | null | undefined) ?? null,
    updatedAt: (doc.updatedAt as string | Date | null | undefined) ?? null,
  };
}

function toFile(doc: Record<string, unknown>): MediaFile {
  return {
    id: idOf(doc),
    folderId: doc.folderId != null && doc.folderId !== '' ? String(doc.folderId) : null,
    name: String(doc.name ?? ''),
    disk: String(doc.disk ?? 'shamar'),
    key: String(doc.key ?? ''),
    mime: String(doc.mime ?? 'application/octet-stream'),
    size: Number(doc.size ?? 0),
    visibility: doc.visibility === 'public' ? 'public' : 'private',
    checksum: doc.checksum != null ? String(doc.checksum) : null,
    width: doc.width != null ? Number(doc.width) : null,
    height: doc.height != null ? Number(doc.height) : null,
    createdAt: (doc.createdAt as string | Date | null | undefined) ?? null,
    updatedAt: (doc.updatedAt as string | Date | null | undefined) ?? null,
  };
}

async function runQuery(query: MediaLucidQuery): Promise<MediaLucidRow[]> {
  if (typeof query.exec === 'function') return query.exec();
  return await (query as unknown as Promise<MediaLucidRow[]>);
}

function applyParent(query: MediaLucidQuery, parentId: string | null): MediaLucidQuery {
  if (parentId == null || parentId === '') return query.whereNull('parentId');
  return query.where('parentId', parentId);
}

function applyFolderId(query: MediaLucidQuery, folderId: string | null): MediaLucidQuery {
  if (folderId == null || folderId === '') return query.whereNull('folderId');
  return query.where('folderId', folderId);
}

async function breadcrumbsFor(
  Folder: MediaLucidModel,
  folderId: string | null,
): Promise<MediaFolder[]> {
  const crumbs: MediaFolder[] = [];
  let currentId = folderId;
  const guard = new Set<string>();
  while (currentId) {
    if (guard.has(currentId)) break;
    guard.add(currentId);
    const row = await Folder.find(currentId);
    if (!row) break;
    const folder = toFolder(toRecord(row));
    crumbs.unshift(folder);
    currentId = folder.parentId;
  }
  return crumbs;
}

async function collectDescendantFolderIds(
  Folder: MediaLucidModel,
  rootId: string,
): Promise<string[]> {
  const ids = [rootId];
  const queue = [rootId];
  while (queue.length) {
    const parentId = queue.shift()!;
    const children = await runQuery(Folder.query().where('parentId', parentId));
    for (const child of children) {
      const id = idOf(toRecord(child));
      ids.push(id);
      queue.push(id);
    }
  }
  return ids;
}

/**
 * Create a {@link MediaLibraryAdapter} backed by Lucid folder/file models.
 */
export function createLucidMediaLibraryAdapter(
  options: LucidMediaLibraryOptions,
): MediaLibraryAdapter {
  const { Folder, File } = options;

  return {
    async browse(query: MediaBrowseQuery = {}): Promise<MediaBrowseResult> {
      const folderId = query.folderId ?? null;
      const searching = Boolean(query.search?.trim() && query.globalSearch);
      const folderRow = !searching && folderId ? await Folder.find(folderId) : null;
      const folder = folderRow ? toFolder(toRecord(folderRow)) : null;

      let folderQuery = searching
        ? Folder.query().orderBy('name', 'asc')
        : applyParent(Folder.query(), folderId).orderBy('name', 'asc');
      let fileQuery = searching
        ? File.query().orderBy('name', 'asc')
        : applyFolderId(File.query(), folderId).orderBy('name', 'asc');

      if (query.search?.trim()) {
        const term = `%${query.search.trim()}%`;
        if (!searching) {
          if (typeof folderQuery.whereILike === 'function') {
            folderQuery = folderQuery.whereILike('name', term);
          } else {
            folderQuery = folderQuery.where('name', 'like', term);
          }
        }
        if (typeof fileQuery.whereILike === 'function') {
          fileQuery = fileQuery.whereILike('name', term);
        } else {
          fileQuery = fileQuery.where('name', 'like', term);
        }
      }

      if (query.mimePrefix?.trim()) {
        fileQuery = fileQuery.where('mime', 'like', `${query.mimePrefix.trim()}%`);
      }

      const [folderRows, fileRows, crumbs] = await Promise.all([
        searching ? Promise.resolve([]) : runQuery(folderQuery),
        runQuery(fileQuery),
        searching ? Promise.resolve([]) : breadcrumbsFor(Folder, folderId),
      ]);

      return {
        folder,
        breadcrumbs: crumbs,
        folders: folderRows.map((row) => toFolder(toRecord(row))),
        files: fileRows.map((row) => toFile(toRecord(row))),
      };
    },

    async getFolder(id) {
      const row = await Folder.find(id);
      return row ? toFolder(toRecord(row)) : null;
    },

    async getFile(id) {
      const row = await File.find(id);
      return row ? toFile(toRecord(row)) : null;
    },

    async getFiles(ids) {
      if (!ids.length) return [];
      const rows = await runQuery(File.query().whereIn('id', ids));
      const byId = new Map(rows.map((row) => {
        const file = toFile(toRecord(row));
        return [file.id, file] as const;
      }));
      return ids.map((id) => byId.get(String(id))).filter(Boolean) as MediaFile[];
    },

    async listFolders() {
      const rows = await runQuery(Folder.query().orderBy('name', 'asc'));
      return rows.map((row) => toFolder(toRecord(row)));
    },

    async createFolder(input: MediaCreateFolderInput) {
      const name = input.name.trim();
      if (!name) throw new Error('Folder name is required');
      const row = await Folder.create({
        name,
        parentId: input.parentId ?? null,
      });
      return toFolder(toRecord(row));
    },

    async renameFolder(id, input: MediaRenameInput) {
      const name = input.name.trim();
      if (!name) throw new Error('Folder name is required');
      const row = await Folder.findOrFail(id);
      row.merge({ name });
      await row.save();
      return toFolder(toRecord(row));
    },

    async moveFolder(id, input: MediaMoveInput) {
      if (input.folderId === id) throw new Error('Cannot move a folder into itself');
      if (input.folderId) {
        const descendants = await collectDescendantFolderIds(Folder, id);
        if (descendants.includes(input.folderId)) {
          throw new Error('Cannot move a folder into one of its descendants');
        }
      }
      const row = await Folder.findOrFail(id);
      row.merge({ parentId: input.folderId });
      await row.save();
      return toFolder(toRecord(row));
    },

    async deleteFolder(id) {
      const folderIds = await collectDescendantFolderIds(Folder, id);
      const files: MediaFile[] = [];
      for (const folderId of folderIds) {
        const rows = await runQuery(File.query().where('folderId', folderId));
        for (const row of rows) {
          files.push(toFile(toRecord(row)));
          await row.delete();
        }
      }
      // Delete deepest folders first
      for (const folderId of [...folderIds].reverse()) {
        const row = await Folder.find(folderId);
        if (row) await row.delete();
      }
      return { files };
    },

    async createFile(input: MediaCreateFileInput) {
      const name = input.name.trim();
      if (!name) throw new Error('File name is required');
      if (!input.key?.trim()) throw new Error('File storage key is required');
      const row = await File.create({
        folderId: input.folderId ?? null,
        name,
        disk: input.disk,
        key: input.key,
        mime: input.mime || 'application/octet-stream',
        size: input.size ?? 0,
        visibility: input.visibility === 'public' ? 'public' : 'private',
        checksum: input.checksum ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
      });
      return toFile(toRecord(row));
    },

    async renameFile(id, input: MediaRenameInput) {
      const name = input.name.trim();
      if (!name) throw new Error('File name is required');
      const row = await File.findOrFail(id);
      row.merge({ name });
      await row.save();
      return toFile(toRecord(row));
    },

    async moveFile(id, input: MediaMoveInput) {
      const row = await File.findOrFail(id);
      row.merge({ folderId: input.folderId });
      await row.save();
      return toFile(toRecord(row));
    },

    async setFileVisibility(id, input) {
      const visibility = input.visibility === 'public' ? 'public' : 'private';
      const row = await File.findOrFail(id);
      row.merge({ visibility });
      await row.save();
      return toFile(toRecord(row));
    },

    async deleteFile(id) {
      const row = await File.findOrFail(id);
      const file = toFile(toRecord(row));
      await row.delete();
      return file;
    },

    async search({ q, mimePrefix, limit = 40 }) {
      let query = File.query().orderBy('name', 'asc').limit(limit);
      if (q.trim() && typeof query.whereILike === 'function') {
        query = query.whereILike('name', `%${q.trim()}%`);
      } else if (q.trim()) {
        query = query.where('name', 'like', `%${q.trim()}%`);
      }
      if (mimePrefix?.trim()) {
        query = query.where('mime', 'like', `${mimePrefix.trim()}%`);
      }
      const rows = await runQuery(query);
      return rows.map((row) => toFile(toRecord(row)));
    },
  };
}
