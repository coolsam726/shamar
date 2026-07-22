import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { actions } from '../src/actions.js';
import { form, TextInput } from '../src/form.js';
import { Resource } from '../src/resource.js';
import { ResourceRegistry } from '../src/registry.js';
import { table, TextColumn } from '../src/table.js';

class UserResource extends Resource {
  static override slug = 'users';
  static override label = 'Users';
  static override singularLabel = 'User';
  static override model = 'User';

  static override form() {
    return form((f) => {
      f.schema([
        TextInput.make('name').required(),
        TextInput.make('email').email().required().searchable(),
        TextInput.make('password').password().createOnly(),
      ]);
    });
  }

  static override table() {
    return table((t) => {
      t.schema([
        TextColumn.make('name').sortable(),
        TextColumn.make('email').sortable().searchable(),
        TextColumn.make('active').toggle(),
      ]);
    });
  }

  static override resourceActions() {
    return actions((a) => {
      a.create();
      a.edit();
      a.delete();
    });
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
