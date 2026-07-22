import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  collectDisplayPaths,
  getRecordValue,
  resolveRelationDisplayBinding,
  singularizeResourceSlug,
} from '../src/record-value.js';
import {
  Select,
  CheckboxList,
  form,
  table,
  infolist,
  TextColumn,
  TextEntry,
  Section,
  Resource,
} from '../src/index.js';

describe('record value paths', () => {
  it('reads nested object properties', () => {
    const record = { company: { name: 'Acme Corp' } };
    assert.equal(getRecordValue(record, 'company.name'), 'Acme Corp');
    assert.equal(getRecordValue(record, 'name'), undefined);
  });

  it('maps attributes across related object arrays', () => {
    const record = {
      categories: [{ name: 'Hardware' }, { name: 'Software' }],
    };
    assert.deepEqual(getRecordValue(record, 'categories.name'), ['Hardware', 'Software']);
  });

  it('singularizes resource slugs', () => {
    assert.equal(singularizeResourceSlug('companies'), 'company');
    assert.equal(singularizeResourceSlug('categories'), 'category');
  });
});

describe('relation display bindings', () => {
  class DemoResource extends Resource {
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
        t.schema([TextColumn.make('company.name'), TextColumn.make('categories.name')]);
      });
    }
    static override infolist() {
      return infolist((i) => {
        i.schema([
          Section.make('Main').schema([
            TextEntry.make('company.name'),
            TextEntry.make('categories.name').badge(),
          ]),
        ]);
      });
    }
  }

  const meta = DemoResource.configure();

  it('collects dot paths from columns and entries', () => {
    assert.deepEqual(collectDisplayPaths(meta).sort(), ['categories.name', 'company.name']);
  });

  it('resolves belongsTo and manyToMany bindings from form relations', () => {
    const company = resolveRelationDisplayBinding(meta, 'company.name');
    assert.ok(company);
    assert.equal(company.fieldName, 'companyId');
    assert.equal(company.root, 'company');
    assert.equal(company.attribute, 'name');
    assert.equal(company.relation.resource, 'companies');

    const categories = resolveRelationDisplayBinding(meta, 'categories.name');
    assert.ok(categories);
    assert.equal(categories.fieldName, 'categoryIds');
    assert.equal(categories.root, 'categories');
    assert.equal(categories.relation.kind, 'manyToMany');
  });
});
