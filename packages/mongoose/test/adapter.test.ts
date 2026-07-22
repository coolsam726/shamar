import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Resource, form, table, TextInput, TextColumn } from '@shamar/core';
import { createMongooseAdapter } from '../src/index.js';

const ID = '507f1f77bcf86cd799439011';

function createMockModel(seed: Record<string, unknown>[] = []) {
  const docs = seed.map((doc) => ({ ...doc }));

  const Model = Object.assign(
    function MockModel() {},
    {
      find(filter: Record<string, unknown>) {
        const matched = docs.filter((doc) => matches(doc, filter));
        return {
          sort(_sort: Record<string, number>) {
            return {
              skip(n: number) {
                return {
                  limit(m: number) {
                    return {
                      async lean() {
                        return matched.slice(n, n + m);
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
      async countDocuments(filter: Record<string, unknown>) {
        return docs.filter((doc) => matches(doc, filter)).length;
      },
      findById(id: string) {
        return {
          async lean() {
            return docs.find((doc) => String(doc._id) === id) ?? null;
          },
        };
      },
      async create(data: Record<string, unknown>) {
        const doc = { _id: ID, ...data };
        docs.push(doc);
        return doc;
      },
      async findByIdAndUpdate(id: string, data: Record<string, unknown>) {
        const idx = docs.findIndex((doc) => String(doc._id) === id);
        if (idx < 0) return null;
        docs[idx] = { ...docs[idx], ...data };
        return docs[idx];
      },
      async findByIdAndDelete(id: string) {
        const idx = docs.findIndex((doc) => String(doc._id) === id);
        if (idx < 0) return null;
        const [removed] = docs.splice(idx, 1);
        return removed;
      },
      findOne() {
        return { async lean() { return null; } };
      },
    },
  );

  return Model;
}

function matches(doc: Record<string, unknown>, filter: Record<string, unknown>): boolean {
  if (Object.keys(filter).length === 0) return true;
  if (filter.$and && Array.isArray(filter.$and)) {
    return (filter.$and as Record<string, unknown>[]).every((part) => matches(doc, part));
  }
  if (filter.$or && Array.isArray(filter.$or)) {
    return (filter.$or as Record<string, unknown>[]).some((part) => matches(doc, part));
  }
  for (const [key, value] of Object.entries(filter)) {
    if (key.startsWith('$')) continue;
    if (value && typeof value === 'object' && '$regex' in (value as object)) {
      const re = new RegExp(
        String((value as { $regex: string }).$regex),
        String((value as { $options?: string }).$options ?? ''),
      );
      if (!re.test(String(doc[key] ?? ''))) return false;
      continue;
    }
    if (value && typeof value === 'object' && '$ne' in (value as object)) {
      if (doc[key] === (value as { $ne: unknown }).$ne) return false;
      continue;
    }
    if (value && typeof value === 'object' && '$exists' in (value as object)) {
      const exists = (value as { $exists: boolean }).$exists;
      if (exists ? doc[key] === undefined : doc[key] !== undefined) return false;
      continue;
    }
    if (doc[key] !== value) return false;
  }
  return true;
}

class ProductResource extends Resource {
  static override slug = 'products';
  static override label = 'Products';
  static override singularLabel = 'Product';
  static override model = createMockModel([
    { _id: ID, name: 'Widget', sku: 'W-1' },
  ]);

  static override form() {
    return form((f) => {
      f.schema([
        TextInput.make('name').required().searchable(),
        TextInput.make('sku').searchable(),
      ]);
    });
  }

  static override table() {
    return table((t) => {
      t.schema([
        TextColumn.make('name').sortable().searchable(),
        TextColumn.make('sku').searchable(),
      ]);
    });
  }
}

describe('@shamar/mongoose adapter', () => {
  it('lists and maps _id to id', async () => {
    const adapter = createMongooseAdapter();
    const meta = ProductResource.configure();
    const result = await adapter.list(meta, {
      page: 1,
      perPage: 15,
    });

    assert.equal(result.total, 1);
    assert.equal(result.items[0]?.id, ID);
    assert.equal(result.items[0]?.name, 'Widget');
  });

  it('finds, updates, and deletes a record', async () => {
    const Model = createMockModel([{ _id: ID, name: 'A', sku: '1' }]);
    class Temp extends Resource {
      static override slug = 'temps';
      static override model = Model;
      static override form() {
        return form((f) => {
          f.schema([TextInput.make('name').searchable()]);
        });
      }
      static override table() {
        return table((t) => {
          t.schema([TextColumn.make('name').searchable()]);
        });
      }
    }

    const adapter = createMongooseAdapter();
    const meta = Temp.configure();

    const found = await adapter.findOne(meta, ID);
    assert.equal(found.name, 'A');

    const updated = await adapter.update(meta, ID, { name: 'B' });
    assert.equal(updated.name, 'B');

    await adapter.delete(meta, ID);
    await assert.rejects(() => adapter.findOne(meta, ID));
  });

  it('creates a record', async () => {
    const Model = createMockModel([]);
    class Temp extends Resource {
      static override slug = 'temps';
      static override model = Model;
      static override form() {
        return form((f) => {
          f.schema([TextInput.make('name')]);
        });
      }
      static override table() {
        return table((t) => {
          t.schema([TextColumn.make('name')]);
        });
      }
    }

    const adapter = createMongooseAdapter();
    const created = await adapter.create(Temp.configure(), { name: 'New' });
    assert.equal(created.name, 'New');
    assert.equal(created.id, ID);
  });

  it('checks uniqueness via exists()', async () => {
    const Model = createMockModel([{ _id: ID, name: 'A', code: 'ACME' }]);
    class Temp extends Resource {
      static override slug = 'temps';
      static override model = Model;
      static override form() {
        return form((f) => {
          f.schema([TextInput.make('code')]);
        });
      }
      static override table() {
        return table((t) => {
          t.schema([TextColumn.make('code')]);
        });
      }
    }

    const adapter = createMongooseAdapter();
    const meta = Temp.configure();
    assert.equal(await adapter.exists(meta, 'code', 'ACME'), true);
    assert.equal(await adapter.exists(meta, 'code', 'OTHER'), false);
    assert.equal(await adapter.exists(meta, 'code', 'ACME', { excludeId: ID }), false);
  });

  it('resolves string model names via connection', async () => {
    const Model = createMockModel([{ _id: ID, name: 'ViaConn' }]);
    const connection = {
      model: (name: string) => {
        assert.equal(name, 'Widget');
        return Model as never;
      },
    };

    class Temp extends Resource {
      static override slug = 'widgets';
      static override model = 'Widget';
      static override form() {
        return form((f) => {
          f.schema([TextInput.make('name').searchable()]);
        });
      }
      static override table() {
        return table((t) => {
          t.schema([TextColumn.make('name').searchable()]);
        });
      }
    }

    const adapter = createMongooseAdapter({ connection });
    const result = await adapter.list(Temp.configure(), { page: 1, perPage: 10 });
    assert.equal(result.items[0]?.name, 'ViaConn');
  });
});
