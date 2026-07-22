import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CheckboxList,
  Select,
  TextColumn,
  TextEntry,
  form,
  infolist,
  table,
  Section,
  Resource,
} from '@shamar/core';
import { cellValue, badgeValues } from '../src/shamar/list-query.js';
import { hydrateRecordsForDisplay } from '../src/shamar/display-relations.js';

class ProductResource extends Resource {
  static override slug = 'products';
  static override form() {
    return form((f) => {
      f.schema([
        Select.make('companyId').relationship('companies', 'name'),
        CheckboxList.make('categoryIds').relationship('categories', 'name'),
      ]);
    });
  }
  static override table() {
    return table((t) => {
      t.schema([TextColumn.make('company.name').label('Company')]);
    });
  }
  static override infolist() {
    return infolist((i) => {
      i.schema([
        Section.make('Main').schema([
          TextEntry.make('company.name').label('Company'),
          TextEntry.make('categories.name').label('Categories').badge(),
        ]),
      ]);
    });
  }
}

const companiesMeta = {
  slug: 'companies',
  label: 'Companies',
  singularLabel: 'Company',
  model: 'Company',
  recordTitleField: 'name',
  fields: [],
  form: { schema: [], sections: [], fields: [] },
  columns: [],
  infolist: { schema: [], sections: [], entries: [] },
  hasExplicitInfolist: false,
  actions: [],
  searchableFields: [],
};

const categoriesMeta = {
  slug: 'categories',
  label: 'Categories',
  singularLabel: 'Category',
  model: 'Category',
  recordTitleField: 'name',
  fields: [],
  form: { schema: [], sections: [], fields: [] },
  columns: [],
  infolist: { schema: [], sections: [], entries: [] },
  hasExplicitInfolist: false,
  actions: [],
  searchableFields: [],
};

const registry = {
  require(slug: string) {
    if (slug === 'companies') return companiesMeta;
    if (slug === 'categories') return categoriesMeta;
    throw new Error(`unknown ${slug}`);
  },
};

const adapter = {
  async search(meta: { slug: string }, query: { ids?: string[] }) {
    const labels: Record<string, string> =
      meta.slug === 'companies'
        ? { c1: 'Acme Corp', c2: 'Beta Inc' }
        : { a1: 'Hardware', a2: 'Software' };
    return (query.ids ?? []).map((id) => ({
      id,
      label: labels[id] ?? id,
    }));
  },
};

describe('display relation hydration', () => {
  const meta = ProductResource.configure();

  it('hydrates belongsTo and manyToMany dot paths', async () => {
    const record: Record<string, unknown> = {
      id: 'p1',
      companyId: 'c1',
      categoryIds: ['a1', 'a2'],
    };

    await hydrateRecordsForDisplay(meta, [record], registry, adapter as never);

    assert.deepEqual(record.company, { id: 'c1', name: 'Acme Corp' });
    assert.deepEqual(record.categories, [
      { id: 'a1', name: 'Hardware' },
      { id: 'a2', name: 'Software' },
    ]);

    assert.equal(cellValue(record, { name: 'company.name', type: 'text' }), 'Acme Corp');
    assert.deepEqual(badgeValues(record, { name: 'categories.name' }), [
      'Hardware',
      'Software',
    ]);
  });
});
