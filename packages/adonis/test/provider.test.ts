import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Resource, form, table, panel, TextInput, Toggle, TextColumn } from '@shamar/core';
import { defineConfig, createShamarRuntime } from '../src/index.js';
import { evaluateFormState } from '../src/form-state.js';

class CompanyResource extends Resource {
  static override slug = 'companies';
  static override label = 'Companies';
  static override singularLabel = 'Company';
  static override model = 'Company';

  static override form() {
    return form((f) => {
      f.schema([
        TextInput.make('name')
          .required()
          .live()
          .afterStateUpdated(({ get, set }) => {
            set('code', String(get('name') ?? '').toUpperCase().slice(0, 8));
          }),
        TextInput.make('code'),
        TextInput.make('email').email(),
        Toggle.make('active'),
      ]);
    });
  }

  static override table() {
    return table((t) => {
      t.schema([
        TextColumn.make('name').sortable().searchable(),
        TextColumn.make('code'),
        TextColumn.make('active').toggle(),
      ]);
    });
  }
}

describe('@shamar/adonis provider', () => {
  it('creates a runtime with config and registers resources', async () => {
    const config = defineConfig({
      resources: [CompanyResource],
      branding: { name: 'My App' },
    });

    const runtime = await createShamarRuntime(config);

    assert.equal(runtime.registry.all().length, 1);
    assert.equal(runtime.registry.require('companies').label, 'Companies');
    assert.equal(runtime.config.path, '/admin');
    assert.equal(runtime.config.apiPrefix, '/api/shamar');
    assert.equal(runtime.config.orm, 'lucid');
    assert.equal(runtime.panels.length, 1);
    assert.equal(runtime.panel('admin').path, '/admin');
  });

  it('selects mongoose adapter when orm is mongoose', async () => {
    const runtime = await createShamarRuntime(
      defineConfig({
        orm: 'mongoose',
        resources: [CompanyResource],
      }),
    );

    assert.equal(runtime.config.orm, 'mongoose');
    assert.equal(typeof runtime.adapter.list, 'function');
  });

  it('registers multiple panels from panel builders', async () => {
    const runtime = await createShamarRuntime(
      defineConfig({
        orm: 'mongoose',
        panels: [
          panel('admin').path('/admin').resources([CompanyResource]),
          panel('app').path('/app').resources([CompanyResource]),
        ],
      }),
    );

    assert.equal(runtime.panels.length, 2);
    assert.equal(runtime.panel('admin').path, '/admin');
    assert.equal(runtime.panel('app').path, '/app');
    assert.equal(runtime.panelByPath('/app/profiles')?.id, 'app');
  });

  it('evaluates form-state hooks for live fields', async () => {
    const meta = CompanyResource.configure();
    const result = await evaluateFormState(meta, {
      operation: 'create',
      changed: 'name',
      state: { name: 'Acme Corp', code: '', email: '', active: false },
    });

    assert.equal(result.state.code, 'ACME COR');
    assert.ok(result.fields.some((f) => f.name === 'name' && f.live === true));
  });
});
