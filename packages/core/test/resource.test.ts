import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TextInput, type FormBuilder } from '../src/form.js';
import { type ActionBuilder } from '../src/actions.js';
import { Resource } from '../src/resource.js';
import { ResourceRegistry } from '../src/registry.js';
import { TextColumn, type TableBuilder } from '../src/table.js';

class UserResource extends Resource {
  static override slug = 'users';
  static override label = 'Users';
  static override singularLabel = 'User';
  static override model = 'User';

  static override form(form: FormBuilder) {
    form.schema([
      TextInput.make('name').required(),
      TextInput.make('email').email().required().searchable(),
      TextInput.make('password').password().createOnly(),
    ]);
    return form
  }

  static override table(table: TableBuilder) {
    table.schema([
      TextColumn.make('name').sortable(),
      TextColumn.make('email').sortable().searchable(),
      TextColumn.make('active').toggle(),
    ]);
    return table
  }

  static override resourceActions(actions: ActionBuilder) {
    actions.create();
    actions.edit();
    actions.delete();
    return actions
  }
}

describe('@shamar/core Resource', () => {
  it('builds Filament-style metadata', () => {
    const meta = UserResource.configure();
    assert.equal(meta.slug, 'users');
    assert.equal(meta.fields.length, 3);
    assert.equal(meta.columns.length, 3);
    assert.deepEqual(meta.searchableFields, ['email']);
    assert.equal(meta.actions.some((a) => a.name === 'create'), true);
  });

  it('registers resources by slug', () => {
    const registry = new ResourceRegistry([UserResource]);
    assert.equal(registry.require('users').label, 'Users');
    assert.throws(() => registry.require('missing'), /Unknown Shamar resource/);
  });
});
