import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Resource, form, table, TextInput, TextColumn } from '@shamar/core';
import { createLucidAdapter } from '../src/index.js';
import { escapeLike } from '../src/like.js';

function createMockLucidModel(rows: Record<string, unknown>[]) {
  return class MockLucidModel {
    static query() {
      const matched = [...rows];
      return {
        where() {
          return this;
        },
        whereIn() {
          return this;
        },
        whereILike() {
          return this;
        },
        orWhereILike() {
          return this;
        },
        whereNull() {
          return this;
        },
        orderBy() {
          return this;
        },
        async paginate(_page: number, _perPage: number) {
          return {
            total: matched.length,
            all() {
              return matched.map((attrs) => ({
                $attributes: attrs,
                serialize: () => ({ ...attrs }),
                toJSON: () => ({ ...attrs }),
                merge() {
                  return this;
                },
                async save() {},
                async delete() {},
              }));
            },
          };
        },
        async first() {
          return null;
        },
        async delete() {},
      };
    }
    static async create() {
      return {};
    }
    static async findOrFail() {
      throw new Error('not found');
    }
  };
}

describe('@shamar/lucid adapter search enrichment', () => {
  it('returns name, group, and ability for permission-like rows', async () => {
    const Model = createMockLucidModel([
      {
        id: 1,
        label: 'Products — View any',
        name: 'products:viewAny',
        resource: 'products',
        ability: 'viewAny',
      },
      {
        id: 2,
        label: 'Superuser (all)',
        name: '*',
        resource: '*',
        ability: '*',
      },
    ]);

    class PermissionResource extends Resource {
      static override slug = 'permissions';
      static override model = Model;
      static override form() {
        return form((f) => {
          f.schema([TextInput.make('label').searchable()]);
        });
      }
      static override table() {
        return table((t) => {
          t.schema([TextColumn.make('label').searchable()]);
        });
      }
    }

    const adapter = createLucidAdapter();
    const results = await adapter.search(PermissionResource.configure(), {
      titleAttribute: 'label',
      limit: 50,
    });

    assert.equal(results.length, 2);
    assert.deepEqual(results[0], {
      id: '1',
      label: 'Products — View any',
      name: 'products:viewAny',
      group: 'products',
      ability: 'viewAny',
    });
    assert.deepEqual(results[1], {
      id: '2',
      label: 'Superuser (all)',
      name: '*',
      group: '*',
      ability: '*',
    });
  });

  it('escapes backslashes in table search so LIKE does not throw', async () => {
    const calls: { sql: string; bindings: unknown[] }[] = [];

    class CatalogModel {
      static query() {
        const builder = {
          client: { dialect: { name: 'postgres' } },
          whereRaw(sql: string, bindings: unknown[]) {
            calls.push({ sql, bindings });
            return this;
          },
          orWhereRaw(sql: string, bindings: unknown[]) {
            calls.push({ sql, bindings });
            return this;
          },
          where() {
            return this;
          },
          orderBy() {
            return this;
          },
          async paginate() {
            return { total: 0, all: () => [] };
          },
        };
        return builder;
      }
    }

    class Catalog extends Resource {
      static override slug = 'catalog';
      static override model = CatalogModel;
      static override form() {
        return form((f) => {
          f.schema([TextInput.make('sku').searchable()]);
        });
      }
      static override table() {
        return table((t) => {
          t.schema([
            TextColumn.make('sku').searchable(),
            TextColumn.make('name').searchable(),
          ]);
        });
      }
    }

    const adapter = createLucidAdapter();
    await adapter.list(Catalog.configure(), { page: 1, perPage: 10, search: '\\' });

    assert.equal(calls.length, 2);
    assert.equal(calls[0]?.sql, '?? ilike ? escape ?');
    assert.deepEqual(calls[0]?.bindings, ['sku', `%${escapeLike('\\')}%`, '\\']);
    assert.equal(calls[1]?.sql, '?? ilike ? escape ?');
    assert.equal(String(calls[0]?.bindings[1]).endsWith('\\'), false);
  });

  it('requests only soft-deleted rows when the list is filtered to trashed', async () => {
    const calls: string[] = [];

    class CatalogModel {
      static query() {
        return {
          whereNotNull(field: string) {
            calls.push(`not-null:${field}`);
            return this;
          },
          whereNull(field: string) {
            calls.push(`null:${field}`);
            return this;
          },
          where() {
            return this;
          },
          orderBy() {
            return this;
          },
          async paginate() {
            return { total: 0, all: () => [] };
          },
        };
      }
    }

    class Catalog extends Resource {
      static override slug = 'catalog';
      static override model = CatalogModel;
      static override softDelete = true;
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

    const adapter = createLucidAdapter();
    const meta = Catalog.configure();
    await adapter.list(meta, { page: 1, perPage: 10 });
    await adapter.list(meta, { page: 1, perPage: 10, trashed: 'only' });
    await adapter.list(meta, { page: 1, perPage: 10, trashed: 'with' });

    assert.deepEqual(calls, ['null:deletedAt', 'not-null:deletedAt']);
  });
});
