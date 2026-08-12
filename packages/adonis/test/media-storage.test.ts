import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  checksumOf,
  createLocalMediaStorage,
  isImageLike,
  isImageMime,
  mediaObjectKey,
  resolveUploadMime,
  sanitizeFilename,
} from '../src/shamar/media-storage.js';

describe('media-storage', () => {
  it('sanitizes filenames and builds object keys', () => {
    assert.equal(sanitizeFilename('evil/name?.png'), 'evil_name_.png');
    assert.match(mediaObjectKey(null, 'a.png'), /^root\/[0-9a-f-]{36}-a\.png$/i);
    assert.match(
      mediaObjectKey('folder1', 'a.png'),
      /^folders\/folder1\/[0-9a-f-]{36}-a\.png$/i,
    );
  });

  it('detects image mime types and checksums buffers', () => {
    assert.equal(isImageMime('image/png'), true);
    assert.equal(isImageMime('image/svg+xml'), true);
    assert.equal(isImageMime('application/pdf'), false);
    assert.equal(isImageLike({ mime: 'application/octet-stream', name: 'logo.svg' }), true);
    assert.equal(isImageLike({ mime: 'text/plain', name: 'notes.txt' }), false);
    assert.equal(resolveUploadMime('mark.svg', 'application/octet-stream'), 'image/svg+xml');
    assert.equal(resolveUploadMime('mark.svg', 'image/svg+xml'), 'image/svg+xml');
    assert.equal(resolveUploadMime('photo.png', ''), 'image/png');
    const buf = Buffer.from('hello');
    assert.equal(checksumOf(buf), checksumOf(Buffer.from('hello')));
    assert.notEqual(checksumOf(buf), checksumOf(Buffer.from('world')));
  });

  it('puts, gets, and deletes local blobs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'shamar-media-'));
    try {
      const storage = createLocalMediaStorage({ disk: 'shamar', root });
      const key = 'demo/hello.txt';
      await storage.put(key, Buffer.from('hi'));
      assert.equal(await storage.exists(key), true);
      assert.equal((await storage.get(key)).toString('utf8'), 'hi');
      const abs = storage.absolutePath?.(key);
      assert.ok(abs);
      assert.equal((await readFile(abs!)).toString('utf8'), 'hi');
      await storage.delete(key);
      assert.equal(await storage.exists(key), false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects path traversal keys', async () => {
    const root = await mkdtemp(join(tmpdir(), 'shamar-media-'));
    try {
      const storage = createLocalMediaStorage({ root });
      await assert.rejects(() => storage.put('../outside.txt', Buffer.from('x')));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
