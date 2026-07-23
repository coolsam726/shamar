import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Select, RelationTable, CheckboxList } from '@shamar/core';
import { buildRelationUiConfig } from '../src/shamar/relation-fields.js';

describe('relation field UI config', () => {
  it('builds BelongsTo combobox URLs and create flags', () => {
    const field = Select.make('companyId')
      .relationship('companies', 'name')
      .createOption()
      .createAndEditOption()
      .build();

    const ui = buildRelationUiConfig({
      field,
      parentMeta: {
        slug: 'products',
        singularLabel: 'Product',
        label: 'Products',
        model: 'Product',
        fields: [field],
        columns: [],
        searchableFields: [],
        actions: [],
      } as never,
      relatedMeta: {
        slug: 'companies',
        singularLabel: 'Company',
        label: 'Companies',
        model: 'Company',
        fields: [],
        columns: [],
        searchableFields: [],
        actions: [],
      } as never,
      basePath: '/admin',
      record: { id: 'p1', companyId: 'c1' },
      initialItems: [{ id: 'c1', label: 'Acme' }],
      operation: 'edit',
    });

    assert.equal(ui.widget, 'combobox');
    assert.equal(ui.kind, 'belongsTo');
    assert.equal(ui.initialId, 'c1');
    assert.equal(ui.initialLabel, 'Acme');
    assert.ok(ui.searchUrl.includes('/admin/products/relation-search?field=companyId'));
    assert.equal(ui.quickCreateUrl, '/admin/products/relation-quick-create');
    assert.equal(ui.createUrl, '/admin/companies/create');
    assert.equal(ui.requiresParent, false);
  });

  it('marks hasMany table as requiring parent on create', () => {
    const field = RelationTable.make('products')
      .relationship('products', 'name', { foreignKey: 'companyId' })
      .createAndEditOption()
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
      relatedMeta: {
        slug: 'products',
        singularLabel: 'Product',
        label: 'Products',
        model: 'Product',
        fields: [],
        columns: [],
        searchableFields: [],
        actions: [],
      } as never,
      basePath: '/admin',
      record: null,
      operation: 'create',
    });

    assert.equal(ui.widget, 'table');
    assert.equal(ui.requiresParent, true);
    assert.equal(ui.attachUrl, '/admin/companies/relation-attach');
    assert.equal(ui.createUrl, '/admin/products/create');
    assert.equal(ui.listUrl, null);
  });

  it('builds checkbox list for manyToMany', () => {
    const field = CheckboxList.make('categoryIds').relationship('categories', 'name').build();
    const ui = buildRelationUiConfig({
      field,
      parentMeta: {
        slug: 'products',
        singularLabel: 'Product',
        label: 'Products',
        model: 'Product',
        fields: [field],
        columns: [],
        searchableFields: [],
        actions: [],
      } as never,
      relatedMeta: {
        slug: 'categories',
        singularLabel: 'Category',
        label: 'Categories',
        model: 'Category',
        fields: [],
        columns: [],
        searchableFields: [],
        actions: [],
      } as never,
      basePath: '/admin',
      record: { id: 'p1', categoryIds: ['a'] },
      initialItems: [{ id: 'a', label: 'Outdoor' }],
      operation: 'edit',
    });

    assert.equal(ui.widget, 'checkboxList');
    assert.equal(ui.kind, 'manyToMany');
    assert.deepEqual(ui.initialItems, [{ id: 'a', label: 'Outdoor' }]);
  });

  it('marks relation UI readonly on show', () => {
    const field = CheckboxList.make('permissionIds')
      .relationship('permissions', 'label')
      .cascadeWildcards()
      .build();
    const ui = buildRelationUiConfig({
      field,
      parentMeta: {
        slug: 'roles',
        singularLabel: 'Role',
        label: 'Roles',
        model: 'Role',
        fields: [field],
        columns: [],
        searchableFields: [],
        actions: [],
      } as never,
      relatedMeta: {
        slug: 'permissions',
        singularLabel: 'Permission',
        label: 'Permissions',
        model: 'Permission',
        fields: [],
        columns: [],
        searchableFields: [],
        actions: [],
      } as never,
      basePath: '/admin',
      record: { id: 'r1', permissionIds: ['p1'] },
      initialItems: [
        { id: 'p1', label: 'All', name: '*', group: '*', ability: '*' },
      ],
      preloadedOptions: [
        { id: 'p1', label: 'All', name: '*', group: '*', ability: '*' },
        { id: 'p2', label: 'Products — View', name: 'products:view', group: 'products', ability: 'view' },
      ],
      operation: 'show',
    });

    assert.equal(ui.readonly, true);
    assert.equal(ui.cascadeWildcards, true);
  });
});
