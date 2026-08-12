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
 * Minimal Mongoose model surface for media folders/files.
 * Duck-typed so `@shamar/mongoose` does not hard-import mongoose.
 */
export interface MediaMongooseModel {
  find(filter: Record<string, unknown>): {
    sort(value: Record<string, 1 | -1>): {
      lean(): Promise<Record<string, unknown>[]>;
      limit?(n: number): { lean(): Promise<Record<string, unknown>[]> };
    };
    lean(): Promise<Record<string, unknown>[]>;
    limit(n: number): { lean(): Promise<Record<string, unknown>[]> };
  };
  findOne(filter: Record<string, unknown>): { lean(): Promise<Record<string, unknown> | null> };
  findById(id: string): { lean(): Promise<Record<string, unknown> | null> };
  create(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  findByIdAndUpdate(
    id: string,
    data: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null>;
  findByIdAndDelete(id: string): Promise<Record<string, unknown> | null>;
  deleteMany(filter: Record<string, unknown>): Promise<unknown>;
}

export interface MongooseMediaLibraryOptions {
  Folder: MediaMongooseModel;
  File: MediaMongooseModel;
}

function idOf(doc: Record<string, unknown>): string {
  const raw = doc.id ?? doc._id;
  return String(raw);
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

function parentFilter(parentId: string | null | undefined): Record<string, unknown> {
  if (parentId == null || parentId === '') {
    return { $or: [{ parentId: null }, { parentId: { $exists: false } }, { parentId: '' }] };
  }
  return { parentId: String(parentId) };
}

function folderIdFilter(folderId: string | null | undefined): Record<string, unknown> {
  if (folderId == null || folderId === '') {
    return { $or: [{ folderId: null }, { folderId: { $exists: false } }, { folderId: '' }] };
  }
  return { folderId: String(folderId) };
}

async function breadcrumbsFor(
  Folder: MediaMongooseModel,
  folderId: string | null,
): Promise<MediaFolder[]> {
  const crumbs: MediaFolder[] = [];
  let currentId = folderId;
  const guard = new Set<string>();
  while (currentId) {
    if (guard.has(currentId)) break;
    guard.add(currentId);
    const doc = await Folder.findById(currentId).lean();
    if (!doc) break;
    const folder = toFolder(doc);
    crumbs.unshift(folder);
    currentId = folder.parentId;
  }
  return crumbs;
}

async function collectDescendantFolderIds(
  Folder: MediaMongooseModel,
  rootId: string,
): Promise<string[]> {
  const ids = [rootId];
  const queue = [rootId];
  while (queue.length) {
    const parentId = queue.shift()!;
    const children = await Folder.find({ parentId }).lean();
    for (const child of children) {
      const id = idOf(child);
      ids.push(id);
      queue.push(id);
    }
  }
  return ids;
}

/**
 * Create a {@link MediaLibraryAdapter} backed by Mongoose folder/file models.
 */
export function createMongooseMediaLibraryAdapter(
  options: MongooseMediaLibraryOptions,
): MediaLibraryAdapter {
  const { Folder, File } = options;

  return {
    async browse(query: MediaBrowseQuery = {}): Promise<MediaBrowseResult> {
      const folderId = query.folderId ?? null;
      const searching = Boolean(query.search?.trim() && query.globalSearch);
      const folderDoc = !searching && folderId ? await Folder.findById(folderId).lean() : null;
      const folder = folderDoc ? toFolder(folderDoc) : null;

      const folderFilter: Record<string, unknown> = searching
        ? { name: { $regex: query.search!.trim(), $options: 'i' } }
        : { ...parentFilter(folderId) };
      if (!searching && query.search?.trim()) {
        folderFilter.name = { $regex: query.search.trim(), $options: 'i' };
      }

      const fileFilter: Record<string, unknown> = searching
        ? {}
        : { ...folderIdFilter(folderId) };
      if (query.search?.trim()) {
        fileFilter.name = { $regex: query.search.trim(), $options: 'i' };
      }
      if (query.mimePrefix?.trim()) {
        fileFilter.mime = { $regex: `^${escapeRegex(query.mimePrefix.trim())}`, $options: 'i' };
      }

      const [folderDocs, fileDocs, crumbs] = await Promise.all([
        searching
          ? Promise.resolve([])
          : Folder.find(folderFilter).sort({ name: 1 }).lean(),
        File.find(fileFilter).sort({ name: 1 }).lean(),
        searching ? Promise.resolve([]) : breadcrumbsFor(Folder, folderId),
      ]);

      return {
        folder,
        breadcrumbs: crumbs,
        folders: folderDocs.map(toFolder),
        files: fileDocs.map(toFile),
      };
    },

    async getFolder(id) {
      const doc = await Folder.findById(id).lean();
      return doc ? toFolder(doc) : null;
    },

    async getFile(id) {
      const doc = await File.findById(id).lean();
      return doc ? toFile(doc) : null;
    },

    async getFiles(ids) {
      if (!ids.length) return [];
      const docs = await File.find({ _id: { $in: ids } }).lean();
      const byId = new Map(docs.map((d) => [idOf(d), toFile(d)]));
      return ids.map((id) => byId.get(String(id))).filter(Boolean) as MediaFile[];
    },

    async listFolders() {
      const docs = await Folder.find({}).sort({ name: 1 }).lean();
      return docs.map(toFolder);
    },

    async createFolder(input: MediaCreateFolderInput) {
      const name = input.name.trim();
      if (!name) throw new Error('Folder name is required');
      const doc = await Folder.create({
        name,
        parentId: input.parentId ?? null,
      });
      const lean =
        typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
          ? (doc as { toObject: () => Record<string, unknown> }).toObject()
          : (doc as Record<string, unknown>);
      return toFolder(lean);
    },

    async renameFolder(id, input: MediaRenameInput) {
      const name = input.name.trim();
      if (!name) throw new Error('Folder name is required');
      const doc = await Folder.findByIdAndUpdate(id, { name }, { new: true });
      if (!doc) throw new Error(`Unknown media folder: ${id}`);
      return toFolder(doc as Record<string, unknown>);
    },

    async moveFolder(id, input: MediaMoveInput) {
      if (input.folderId === id) throw new Error('Cannot move a folder into itself');
      if (input.folderId) {
        const descendants = await collectDescendantFolderIds(Folder, id);
        if (descendants.includes(input.folderId)) {
          throw new Error('Cannot move a folder into one of its descendants');
        }
      }
      const doc = await Folder.findByIdAndUpdate(
        id,
        { parentId: input.folderId },
        { new: true },
      );
      if (!doc) throw new Error(`Unknown media folder: ${id}`);
      return toFolder(doc as Record<string, unknown>);
    },

    async deleteFolder(id) {
      const folderIds = await collectDescendantFolderIds(Folder, id);
      const files: MediaFile[] = [];
      for (const folderId of folderIds) {
        const docs = await File.find({ folderId }).lean();
        files.push(...docs.map(toFile));
        await File.deleteMany({ folderId });
      }
      // Also files wrongly stored with null under nested? only folderId match.
      await Folder.deleteMany({ _id: { $in: folderIds } });
      return { files };
    },

    async createFile(input: MediaCreateFileInput) {
      const name = input.name.trim();
      if (!name) throw new Error('File name is required');
      if (!input.key?.trim()) throw new Error('File storage key is required');
      const doc = await File.create({
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
      const lean =
        typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
          ? (doc as { toObject: () => Record<string, unknown> }).toObject()
          : (doc as Record<string, unknown>);
      return toFile(lean);
    },

    async renameFile(id, input: MediaRenameInput) {
      const name = input.name.trim();
      if (!name) throw new Error('File name is required');
      const doc = await File.findByIdAndUpdate(id, { name }, { new: true });
      if (!doc) throw new Error(`Unknown media file: ${id}`);
      return toFile(doc as Record<string, unknown>);
    },

    async moveFile(id, input: MediaMoveInput) {
      const doc = await File.findByIdAndUpdate(
        id,
        { folderId: input.folderId },
        { new: true },
      );
      if (!doc) throw new Error(`Unknown media file: ${id}`);
      return toFile(doc as Record<string, unknown>);
    },

    async setFileVisibility(id, input) {
      const visibility = input.visibility === 'public' ? 'public' : 'private';
      const doc = await File.findByIdAndUpdate(id, { visibility }, { new: true });
      if (!doc) throw new Error(`Unknown media file: ${id}`);
      return toFile(doc as Record<string, unknown>);
    },

    async deleteFile(id) {
      const doc = await File.findByIdAndDelete(id);
      if (!doc) throw new Error(`Unknown media file: ${id}`);
      return toFile(doc as Record<string, unknown>);
    },

    async search({ q, mimePrefix, limit = 40 }) {
      const filter: Record<string, unknown> = {};
      if (q.trim()) filter.name = { $regex: q.trim(), $options: 'i' };
      if (mimePrefix?.trim()) {
        filter.mime = { $regex: `^${escapeRegex(mimePrefix.trim())}`, $options: 'i' };
      }
      const query = File.find(filter).sort({ name: 1 });
      const docs =
        typeof query.limit === 'function'
          ? await query.limit(limit).lean()
          : (await query.lean()).slice(0, limit);
      return docs.map(toFile);
    },
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
