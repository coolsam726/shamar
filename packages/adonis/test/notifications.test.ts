import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  pushNotification,
  type NotificationSession,
} from '../src/wire/notifications.js';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { storeWireUpload } from '../src/wire/uploads.js';

function memorySession(): NotificationSession & { all: Record<string, unknown> } {
  const all: Record<string, unknown> = {};
  return {
    all,
    get(key) {
      return all[key];
    },
    put(key, value) {
      all[key] = value;
    },
  };
}

describe('panel notifications', () => {
  it('keeps unread notes, then marks one and all as read', () => {
    const session = memorySession();
    const first = pushNotification(session, { title: 'Deleted', body: 'Article' });
    pushNotification(session, { title: 'Restored' });
    assert.equal(listNotifications(session).filter((note) => !note.readAt).length, 2);

    markNotificationRead(session, first.id);
    const after = listNotifications(session);
    assert.equal(after.find((note) => note.id === first.id)?.readAt == null, false);
    assert.equal(after.filter((note) => !note.readAt).length, 1);

    markAllNotificationsRead(session);
    assert.equal(listNotifications(session).every((note) => note.readAt), true);
  });
});

describe('wire uploads', () => {
  it('writes the file under a unique id', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'shamar-wire-'));
    const stored = await storeWireUpload(dir, { name: 'notes.txt', contents: Buffer.from('hello') });
    assert.equal(stored.name, 'notes.txt');
    assert.equal(stored.size, 5);
    const files = await readdir(dir);
    assert.equal(files.length, 1);
    assert.equal(await readFile(join(dir, files[0]!), 'utf8'), 'hello');
  });
});
