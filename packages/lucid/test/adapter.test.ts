import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Resource, form, table, TextInput, TextColumn } from '@shamar/core';
import { createLucidAdapter } from '../src/index.js';

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
});
