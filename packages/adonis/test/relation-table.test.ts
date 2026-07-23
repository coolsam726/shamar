import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  RelationTable,
  TextColumn,
  TextInput,
  Select,
  Checkbox,
  form,
  table,
  Resource,
} from '@shamar/core';
import { buildRelationUiConfig } from '../src/shamar/relation-fields.js';
import {
  buildRelationTableRows,
  relationTableColumns,
  relationTableListMeta,
} from '../src/shamar/relation-table.js';

class ProductResource extends Resource {
  static override slug = 'products';
  static override label = 'Products';
  static override singularLabel = 'Product';
  static override model = 'Product';
  static override form() {
    return form((f) => {
      f.schema([
        TextInput.make('sku').searchable(),
        TextInput.make('name').searchable(),
        Select.make('companyId').relationship('companies', 'name'),
        Checkbox.make('featured'),
      ]);
    });
  }
  static override table() {
    return table((t) => {
      t.defaultSort('name', 'asc').schema([
        TextColumn.make('sku').searchable().sortable(),
        TextColumn.make('name').searchable().sortable(),
        TextColumn.make('company.name').label('Company').filterable(),
        TextColumn.make('featured').boolean().filterable(),
      ]);
    });
  }
}

describe('relation table list helpers', () => {
  const relatedMeta = ProductResource.configure();

  it('excludes the parent FK display column from relation table columns', () => {
    const columns = relationTableColumns(relatedMeta, 'companyId');
    assert.deepEqual(
      columns.map((column) => column.name),
      ['sku', 'name', 'featured'],
    );
  });

  it('builds list metadata with filter headers', () => {
    const meta = relationTableListMeta(relatedMeta, 'companyId');
    assert.equal(meta.columns.length, 3);
    assert.ok(meta.listHeaders.some((header) => header.name === 'featured'));
    assert.equal(
      meta.listHeaders.some((header) => header.name === 'company.name'),
      false,
    );
  });

  it('formats hydrated rows for the embedded table', () => {
    const columns = relationTableColumns(relatedMeta, 'companyId');
    const rows = buildRelationTableRows(
      relatedMeta,
      columns,
      [
        {
          id: 'p1',
          sku: 'SKU-1',
          name: 'Widget',
          featured: true,
          companyId: 'c1',
        },
      ],
      '/admin',
      (record) => String(record.name),
    );

    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.id, 'p1');
    assert.equal(rows[0]!.label, 'Widget');
    assert.equal(rows[0]!.cells.find((cell) => cell.name === 'sku')?.text, 'SKU-1');
    assert.equal(rows[0]!.cells.find((cell) => cell.name === 'featured')?.boolean, true);
  });

  it('adds listUrl and columns for hasMany RelationTable configs', () => {
    const field = RelationTable.make('products')
      .relationship('products', 'name', { foreignKey: 'companyId' })
      .build();

    const ui = buildRelationUiConfig({
      field,
      parentMeta: {
        slug: 'companies',
        singularLabel: 'Company',
        label: 'Companies',
        model: 'Company',
        fields: [field],
        columns: [],
        searchableFields: [],
        actions: [],
      } as never,
      relatedMeta,
      basePath: '/admin',
      record: { id: 'c1' },
      operation: 'edit',
    });

    assert.equal(ui.listUrl, '/admin/companies/relation-table?field=products&parentId=c1');
    assert.ok(ui.columns?.some((column) => column.name === 'sku'));
    assert.equal(ui.columns?.some((column) => column.name === 'company.name'), false);
    assert.equal(ui.defaultSort, 'name');
    assert.equal(ui.perPage, 10);
  });

  it('omits listUrl when RelationTable is simple()', () => {
    const field = RelationTable.make('products')
      .relationship('products', 'name', { foreignKey: 'companyId' })
      .simple()
      .build();

    const ui = buildRelationUiConfig({
      field,
      parentMeta: {
        slug: 'companies',
        singularLabel: 'Company',
        label: 'Companies',
        model: 'Company',
        fields: [field],
        columns: [],
        searchableFields: [],
        actions: [],
      } as never,
      relatedMeta,
      basePath: '/admin',
      record: { id: 'c1' },
      initialItems: [{ id: 'p1', label: 'Widget' }],
      operation: 'edit',
    });

    assert.equal(ui.listUrl, null);
    assert.deepEqual(ui.initialItems, [{ id: 'p1', label: 'Widget' }]);
    assert.equal(ui.columns?.length ?? 0, 0);
  });
});
