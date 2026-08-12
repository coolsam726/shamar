import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { MediaController } from '../src/controllers/media_controller.js';
import { createLocalMediaStorage } from '../src/shamar/media-storage.js';

function createMemoryAdapter() {
  const folders = new Map();
  const files = new Map();
  let seq = 0;
  const nextId = () => `id-${++seq}`;

  return {
    async browse() {
      return { folder: null, breadcrumbs: [], folders: [...folders.values()], files: [...files.values()] };
    },
    async getFolder(id: string) {
      return folders.get(id) ?? null;
    },
    async getFile(id: string) {
      return files.get(id) ?? null;
    },
    async getFiles(ids: string[]) {
      return ids.map((id) => files.get(id)).filter(Boolean);
    },
    async listFolders() {
      return [...folders.values()];
    },
    async createFolder(input: { name: string; parentId?: string | null }) {
      const folder = {
        id: nextId(),
        name: input.name,
        parentId: input.parentId ?? null,
      };
      folders.set(folder.id, folder);
      return folder;
    },
    async renameFolder() {
      throw new Error('not implemented');
    },
    async moveFolder() {
      throw new Error('not implemented');
    },
    async deleteFolder() {
      return { files: [] };
    },
    async createFile(input: Record<string, unknown>) {
      const file = {
        id: nextId(),
        folderId: (input.folderId as string | null) ?? null,
        name: String(input.name),
        disk: String(input.disk),
        key: String(input.key),
        mime: String(input.mime),
        size: Number(input.size ?? 0),
        visibility: input.visibility === 'public' ? 'public' : 'private',
        checksum: (input.checksum as string | null) ?? null,
        width: (input.width as number | null) ?? null,
        height: (input.height as number | null) ?? null,
      };
      files.set(file.id, file);
      return file;
    },
    async renameFile() {
      throw new Error('not implemented');
    },
    async moveFile(id: string, input: { folderId: string | null }) {
      const file = files.get(id);
      if (!file) throw new Error('missing');
      const next = { ...file, folderId: input.folderId };
      files.set(id, next);
      return next;
    },
    async setFileVisibility(id: string, input: { visibility: 'public' | 'private' }) {
      const file = files.get(id);
      if (!file) throw new Error('missing');
      const next = { ...file, visibility: input.visibility };
      files.set(id, next);
      return next;
    },
    async deleteFile(id: string) {
      const file = files.get(id);
      if (!file) throw new Error('missing');
      files.delete(id);
      return file;
    },
    async search() {
      return [...files.values()];
    },
    _files: files,
  };
}

function mockCtx(overrides: Record<string, unknown> = {}) {
  let statusCode = 200;
  let jsonBody: unknown = null;
  const ctx = {
    params: { id: '' },
    request: {
      body: () => ({}),
      qs: () => ({}),
      input: () => undefined,
      file: () => null,
      files: () => [],
      header: () => undefined,
      updateQs: () => undefined,
    },
    response: {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: unknown) {
        jsonBody = body;
        return body;
      },
      header() {
        return this;
      },
      send() {
        return this;
      },
      download() {
        return this;
      },
    },
    view: { render: async () => '' },
    ...overrides,
  };
  return {
    ctx: ctx as never,
    get status() {
      return statusCode;
    },
    get body() {
      return jsonBody as Record<string, unknown> | null;
    },
  };
}

describe('MediaController copy/move', () => {
  it('copies a file into another folder with a new storage key', async () => {
    const root = await mkdtemp(join(tmpdir(), 'shamar-media-copy-'));
    try {
      const adapter = createMemoryAdapter();
      const storage = createLocalMediaStorage({ disk: 'shamar', root });
      await storage.put('root/source.txt', Buffer.from('hello-media'));
      const source = await adapter.createFile({
        folderId: null,
        name: 'source.txt',
        disk: 'shamar',
        key: 'root/source.txt',
        mime: 'text/plain',
        size: 11,
      });

      const controller = new MediaController({
        adapter: adapter as never,
        storage,
        basePath: '/admin',
      });

      const destFolder = await adapter.createFolder({ name: 'Dest' });
      const harness = mockCtx({
        params: { id: source.id },
        request: {
          body: () => ({ folderId: destFolder.id }),
          qs: () => ({}),
          input: () => undefined,
          file: () => null,
          files: () => [],
          header: () => undefined,
          updateQs: () => undefined,
        },
      });

      await controller.copyFile(harness.ctx);
      assert.equal(harness.status, 201);
      const copied = (harness.body as { file: { id: string; folderId: string; key: string; name: string } })
        .file;
      assert.equal(copied.name, 'source.txt');
      assert.equal(copied.folderId, destFolder.id);
      assert.notEqual(copied.key, source.key);
      assert.equal(await storage.exists(copied.key), true);
      assert.equal((await storage.get(copied.key)).toString('utf8'), 'hello-media');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('moves a file via moveFile', async () => {
    const root = await mkdtemp(join(tmpdir(), 'shamar-media-move-'));
    try {
      const adapter = createMemoryAdapter();
      const storage = createLocalMediaStorage({ disk: 'shamar', root });
      const file = await adapter.createFile({
        folderId: null,
        name: 'a.txt',
        disk: 'shamar',
        key: 'a.txt',
        mime: 'text/plain',
        size: 1,
      });
      const folder = await adapter.createFolder({ name: 'Box' });
      const controller = new MediaController({
        adapter: adapter as never,
        storage,
        basePath: '/admin',
      });
      const harness = mockCtx({
        params: { id: file.id },
        request: {
          body: () => ({ folderId: folder.id }),
          qs: () => ({}),
          input: () => undefined,
          file: () => null,
          files: () => [],
          header: () => undefined,
          updateQs: () => undefined,
        },
      });
      await controller.moveFile(harness.ctx);
      assert.equal((harness.body as { file: { folderId: string } }).file.folderId, folder.id);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('serves publicRaw only for public files and toggles visibility', async () => {
    const root = await mkdtemp(join(tmpdir(), 'shamar-media-vis-'));
    try {
      const adapter = createMemoryAdapter();
      const storage = createLocalMediaStorage({ disk: 'shamar', root });
      await storage.put('logo.svg', Buffer.from('<svg></svg>'));
      const file = await adapter.createFile({
        folderId: null,
        name: 'logo.svg',
        disk: 'shamar',
        key: 'logo.svg',
        mime: 'image/svg+xml',
        size: 11,
        visibility: 'private',
      });
      const controller = new MediaController({
        adapter: adapter as never,
        storage,
        basePath: '/admin',
        publicPath: '/media',
      });

      const privateHarness = mockCtx({ params: { id: file.id } });
      await controller.publicRaw(privateHarness.ctx);
      assert.equal(privateHarness.status, 404);

      const visHarness = mockCtx({
        params: { id: file.id },
        request: {
          body: () => ({ visibility: 'public' }),
          qs: () => ({}),
          input: () => undefined,
          file: () => null,
          files: () => [],
          header: () => undefined,
          updateQs: () => undefined,
        },
      });
      await controller.setFileVisibility(visHarness.ctx);
      assert.equal(
        (visHarness.body as { file: { visibility: string; url: string } }).file.visibility,
        'public',
      );
      assert.equal(
        (visHarness.body as { file: { url: string } }).file.url,
        `/media/${file.id}`,
      );

      const publicHarness = mockCtx({ params: { id: file.id } });
      await controller.publicRaw(publicHarness.ctx);
      // download/send path — not JSON error
      assert.notEqual(publicHarness.status, 404);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
