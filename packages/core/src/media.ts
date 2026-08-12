/**
 * ORM-agnostic media library contracts (folders + file metadata).
 * Blob bytes live behind Adonis Drive / host storage — adapters only store keys.
 */

/** Who may fetch the raw bytes without panel auth. Default is private. */
export type MediaVisibility = 'private' | 'public';

export interface MediaFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

export interface MediaFile {
  id: string;
  folderId: string | null;
  name: string;
  /** Drive / storage disk name. */
  disk: string;
  /** Object key within the disk. */
  key: string;
  mime: string;
  size: number;
  /** `public` files are served at the ungated public media path. */
  visibility: MediaVisibility;
  checksum?: string | null;
  width?: number | null;
  height?: number | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

export interface MediaBrowseQuery {
  /** Null / undefined = library root. */
  folderId?: string | null;
  search?: string;
  /**
   * When true with `search`, search the whole library (ignore folder scope for files).
   * Folders are omitted from the result while searching.
   */
  globalSearch?: boolean;
  /** MIME prefix filter, e.g. `image/`. */
  mimePrefix?: string;
}

export interface MediaBrowseResult {
  folder: MediaFolder | null;
  breadcrumbs: MediaFolder[];
  folders: MediaFolder[];
  files: MediaFile[];
}

export interface MediaCreateFolderInput {
  name: string;
  parentId?: string | null;
}

export interface MediaCreateFileInput {
  folderId?: string | null;
  name: string;
  disk: string;
  key: string;
  mime: string;
  size: number;
  visibility?: MediaVisibility;
  checksum?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface MediaRenameInput {
  name: string;
}

export interface MediaMoveInput {
  /** Null = move to root. */
  folderId: string | null;
}

export interface MediaVisibilityInput {
  visibility: MediaVisibility;
}

/**
 * Persist folder/file metadata. Implementations live in `@shamar/mongoose`
 * and `@shamar/lucid`. Storage keys point at blobs on the configured disk.
 */
export interface MediaLibraryAdapter {
  browse(query?: MediaBrowseQuery): Promise<MediaBrowseResult>;

  getFolder(id: string): Promise<MediaFolder | null>;

  getFile(id: string): Promise<MediaFile | null>;

  /** Resolve many files (form hydration / multi-picker). */
  getFiles(ids: string[]): Promise<MediaFile[]>;

  /** Flat list of all folders (for sidebar trees). */
  listFolders(): Promise<MediaFolder[]>;

  createFolder(input: MediaCreateFolderInput): Promise<MediaFolder>;

  renameFolder(id: string, input: MediaRenameInput): Promise<MediaFolder>;

  moveFolder(id: string, input: MediaMoveInput): Promise<MediaFolder>;

  /**
   * Delete a folder and all nested folders/files (metadata only).
   * Returns deleted file records so the host can remove blobs.
   */
  deleteFolder(id: string): Promise<{ files: MediaFile[] }>;

  createFile(input: MediaCreateFileInput): Promise<MediaFile>;

  renameFile(id: string, input: MediaRenameInput): Promise<MediaFile>;

  moveFile(id: string, input: MediaMoveInput): Promise<MediaFile>;

  setFileVisibility(id: string, input: MediaVisibilityInput): Promise<MediaFile>;

  /** Delete file metadata; host removes the blob using `key`/`disk`. */
  deleteFile(id: string): Promise<MediaFile>;

  search(query: { q: string; mimePrefix?: string; limit?: number }): Promise<MediaFile[]>;
}
