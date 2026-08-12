import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMongooseMediaLibraryAdapter } from '../src/index.js';

let seq = 0;
function nextId() {
  seq += 1;
  return `507f1f77bcf86cd7994390${String(seq).padStart(2, '0')}`;
}

function createMediaMockModel(seed: Record<string, unknown>[] = []) {
  const docs = seed.map((doc) => ({ ...doc }));

  function matched(filter: Record<string, unknown>) {
    return docs.filter((doc) => matches(doc, filter));
  }

  return {
    find(filter: Record<string, unknown>) {
      const rows = matched(filter);
      const api = {
        sort(_sort: Record<string, 1 | -1>) {
          return {
            lean: async () => rows.map((d) => ({ ...d })),
            limit(_n: number) {
              return { lean: async () => rows.map((d) => ({ ...d })) };
            },
          };
        },
        lean: async () => rows.map((d) => ({ ...d })),
        limit(_n: number) {
          return { lean: async () => rows.map((d) => ({ ...d })) };
        },
      };
      return api;
    },
    findOne(filter: Record<string, unknown>) {
      return {
        async lean() {
          return matched(filter)[0] ?? null;
        },
      };
    },
    findById(id: string) {
      return {
        async lean() {
          return docs.find((d) => String(d._id) === String(id)) ?? null;
        },
      };
    },
    async create(data: Record<string, unknown>) {
      const doc = { _id: nextId(), ...data };
      docs.push(doc);
      return doc;
    },
    async findByIdAndUpdate(
      id: string,
      data: Record<string, unknown>,
      _options?: Record<string, unknown>,
    ) {
      const idx = docs.findIndex((d) => String(d._id) === String(id));
      if (idx < 0) return null;
      docs[idx] = { ...docs[idx], ...data };
      return docs[idx];
    },
    async findByIdAndDelete(id: string) {
      const idx = docs.findIndex((d) => String(d._id) === String(id));
      if (idx < 0) return null;
      const [removed] = docs.splice(idx, 1);
      return removed;
    },
    async deleteMany(filter: Record<string, unknown>) {
      const before = docs.length;
      for (let i = docs.length - 1; i >= 0; i--) {
        if (matches(docs[i]!, filter)) docs.splice(i, 1);
      }
      return { deletedCount: before - docs.length };
    },
  };
}

function matches(doc: Record<string, unknown>, filter: Record<string, unknown>): boolean {
  if (Object.keys(filter).length === 0) return true;
  if (filter.$and && Array.isArray(filter.$and)) {
    const rest = { ...filter };
    delete rest.$and;
    return (
      (filter.$and as Record<string, unknown>[]).every((part) => matches(doc, part)) &&
      matches(doc, rest)
    );
  }
  if (filter.$or && Array.isArray(filter.$or)) {
    const rest = { ...filter };
    delete rest.$or;
    return (
      (filter.$or as Record<string, unknown>[]).some((part) => matches(doc, part)) &&
      matches(doc, rest)
    );
  }
  for (const [key, value] of Object.entries(filter)) {
    if (key.startsWith('$')) continue;
    const docVal = doc[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      if ('$in' in obj && Array.isArray(obj.$in)) {
        if (!obj.$in.map(String).includes(String(docVal))) return false;
        continue;
      }
      if ('$regex' in obj) {
        const re = new RegExp(String(obj.$regex), String(obj.$options ?? ''));
        if (!re.test(String(docVal ?? ''))) return false;
        continue;
      }
      if ('$exists' in obj) {
        const exists = docVal !== undefined;
        if (Boolean(obj.$exists) !== exists) return false;
        continue;
      }
    }
    if (value === null) {
      if (docVal != null && docVal !== '') return false;
      continue;
    }
    if (String(docVal) !== String(value)) return false;
  }
  return true;
}

describe('createMongooseMediaLibraryAdapter', () => {
  it('creates folders, browses root, and cascades delete', async () => {
    const Folder = createMediaMockModel();
    const File = createMediaMockModel();
    const adapter = createMongooseMediaLibraryAdapter({
      Folder: Folder as never,
      File: File as never,
    });

    const rootFolder = await adapter.createFolder({ name: 'Branding' });
    assert.equal(rootFolder.name, 'Branding');
    assert.equal(rootFolder.parentId, null);

    const nested = await adapter.createFolder({
      name: 'Logos',
      parentId: rootFolder.id,
    });
    assert.equal(nested.parentId, rootFolder.id);

    const file = await adapter.createFile({
      folderId: nested.id,
      name: 'mark.png',
      disk: 'shamar',
      key: 'branding/logos/mark.png',
      mime: 'image/png',
      size: 120,
      checksum: 'abc',
    });
    assert.equal(file.name, 'mark.png');

    const root = await adapter.browse({});
    assert.equal(root.folders.length, 1);
    assert.equal(root.folders[0]?.name, 'Branding');
    assert.equal(root.files.length, 0);

    const inside = await adapter.browse({ folderId: nested.id });
    assert.equal(inside.files.length, 1);
    assert.equal(inside.breadcrumbs.map((b) => b.name).join('/'), 'Branding/Logos');

    const renamed = await adapter.renameFile(file.id, { name: 'mark-v2.png' });
    assert.equal(renamed.name, 'mark-v2.png');

    const { files } = await adapter.deleteFolder(rootFolder.id);
    assert.equal(files.length, 1);
    assert.equal(files[0]?.key, 'branding/logos/mark.png');

    const after = await adapter.browse({});
    assert.equal(after.folders.length, 0);
    assert.equal(after.files.length, 0);
  });

  it('filters files by mime prefix and search', async () => {
    const Folder = createMediaMockModel();
    const File = createMediaMockModel();
    const adapter = createMongooseMediaLibraryAdapter({
      Folder: Folder as never,
      File: File as never,
    });

    await adapter.createFile({
      folderId: null,
      name: 'photo.jpg',
      disk: 'shamar',
      key: 'photo.jpg',
      mime: 'image/jpeg',
      size: 10,
    });
    await adapter.createFile({
      folderId: null,
      name: 'notes.pdf',
      disk: 'shamar',
      key: 'notes.pdf',
      mime: 'application/pdf',
      size: 20,
    });

    const images = await adapter.browse({ mimePrefix: 'image/' });
    assert.equal(images.files.length, 1);
    assert.equal(images.files[0]?.name, 'photo.jpg');

    const search = await adapter.browse({ search: 'notes' });
    assert.equal(search.files.length, 1);
    assert.equal(search.files[0]?.mime, 'application/pdf');
  });
});
