import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AbilitiesAssignment,
  CheckboxList,
  PermissionsAssignment,
  Radio,
  RelationTable,
  Select,
  defaultRelationWidget,
} from '../src/index.js';

describe('relationship builders', () => {
  it('defaults BelongsTo Select to combobox relation widget', () => {
    const field = Select.make('companyId')
      .relationship('companies', 'name')
      .createOption()
      .createAndEditOption()
      .build();

    assert.equal(field.type, 'relation');
    assert.equal(field.relation?.kind, 'belongsTo');
    assert.equal(field.relation?.resource, 'companies');
    assert.equal(field.relation?.labelField, 'name');
    assert.equal(field.relation?.widget, 'combobox');
    assert.equal(field.relation?.createOption, true);
    assert.equal(field.relation?.createAndEditOption, true);
    assert.equal(field.searchable, true);
  });

  it('supports BelongsTo radio widget', () => {
    const viaSelect = Select.make('priorityId').relationship('priorities', 'label').radio().build();
    assert.equal(viaSelect.type, 'radio');
    assert.equal(viaSelect.relation?.widget, 'radio');

    const viaRadio = Radio.make('companyId').relationship('companies', 'name').build();
    assert.equal(viaRadio.type, 'radio');
    assert.equal(viaRadio.relation?.widget, 'radio');
    assert.equal(viaRadio.relation?.kind, 'belongsTo');
  });

  it('defaults manyToMany Select to multiple combobox', () => {
    const field = Select.make('categoryIds')
      .relationship('categories', 'name', { kind: 'manyToMany' })
      .build();

    assert.equal(field.type, 'relation');
    assert.equal(field.multiple, true);
    assert.equal(field.relation?.kind, 'manyToMany');
    assert.equal(field.relation?.widget, 'combobox');
  });

  it('builds CheckboxList manyToMany', () => {
    const field = CheckboxList.make('categoryIds')
      .relationship('categories', 'name')
      .createOption()
      .build();

    assert.equal(field.type, 'checkboxList');
    assert.equal(field.multiple, true);
    assert.equal(field.relation?.kind, 'manyToMany');
    assert.equal(field.relation?.widget, 'checkboxList');
    assert.equal(field.relation?.createOption, true);
  });

  it('builds PermissionsAssignment with Loom defaults', () => {
    const field = PermissionsAssignment.make().build();

    assert.equal(field.name, 'permissionIds');
    assert.equal(field.type, 'checkboxList');
    assert.equal(field.label, 'Permissions');
    assert.equal(field.multiple, true);
    assert.equal(field.columnSpan, 'full');
    assert.equal(field.checkboxColumns, 4);
    assert.equal(field.checkboxFramed, false);
    assert.equal(field.cascadeWildcards, true);
    assert.equal(field.groupBy, 'resource');
    assert.equal(field.relation?.resource, 'permissions');
    assert.equal(field.relation?.labelField, 'label');
    assert.equal(field.relation?.kind, 'manyToMany');
    assert.equal(field.relation?.widget, 'checkboxList');
    assert.equal(field.relation?.cascadeWildcards, true);
    assert.equal(field.relation?.groupBy, 'resource');
  });

  it('builds AbilitiesAssignment with name valueAttribute', () => {
    const field = AbilitiesAssignment.make().build();

    assert.equal(field.name, 'abilities');
    assert.equal(field.type, 'checkboxList');
    assert.equal(field.label, 'Abilities');
    assert.equal(field.relation?.resource, 'permissions');
    assert.equal(field.relation?.valueAttribute, 'name');
    assert.equal(field.relation?.cascadeWildcards, true);
    assert.equal(field.relation?.groupBy, 'resource');
  });

  it('builds RelationTable hasMany as non-dehydrated', () => {
    const field = RelationTable.make('products')
      .relationship('products', 'name', { foreignKey: 'companyId' })
      .createAndEditOption()
      .build();

    assert.equal(field.type, 'relationTable');
    assert.equal(field.dehydrated, false);
    assert.equal(field.multiple, true);
    assert.equal(field.relation?.kind, 'hasMany');
    assert.equal(field.relation?.foreignKey, 'companyId');
    assert.equal(field.relation?.widget, 'table');
    assert.equal(field.relation?.createAndEditOption, true);
  });

  it('maps default widgets by kind', () => {
    assert.equal(defaultRelationWidget('belongsTo'), 'combobox');
    assert.equal(defaultRelationWidget('manyToMany'), 'combobox');
    assert.equal(defaultRelationWidget('hasMany'), 'table');
  });

  it('throws when createOption is called before relationship', () => {
    assert.throws(() => Select.make('x').createOption());
  });
});
