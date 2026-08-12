import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { fieldView, getFieldView, registerFieldView, listFieldViews } from '../src/shamar/field-views.js';
import { parseFieldPayload, toKeyValuePairs, keyValuePairsToRecord, defaultFormValue } from '../src/shamar/field-payload.js';
import { toFormControlValue, toFormDateInputValue, formInputType } from '../src/shamar/list-query.js';

const viewsRoot = join(dirname(fileURLToPath(import.meta.url)), '../resources/views/shamar');

describe('field views', () => {
  it('registers built-in widget views', () => {
    assert.equal(fieldView('richEditor'), 'shamar::partials/fields/rich-editor');
    assert.equal(fieldView('repeater'), 'shamar::partials/fields/repeater');
    assert.equal(getFieldView('date'), 'shamar::partials/fields/date');
    assert.ok(listFieldViews().some((entry) => entry.type === 'slider'));
  });

  it('points every built-in view at an existing Edge file', async () => {
    const missing: string[] = [];
    for (const entry of listFieldViews()) {
      if (!entry.view.startsWith('shamar::')) continue;
      const rel = `${entry.view.slice('shamar::'.length)}.edge`;
      try {
        await access(join(viewsRoot, rel), fsConstants.F_OK);
      } catch {
        missing.push(`${entry.type} → ${rel}`);
      }
    }
    assert.deepEqual(missing, []);
  });

  it('allows host views to replace a type', () => {
    registerFieldView('signature', 'app::fields/signature');
    assert.equal(fieldView('signature'), 'app::fields/signature');
    registerFieldView('signature', 'shamar::partials/fields/date');
  });

  it('rich editor edge exposes notion/document modes', async () => {
    const { readFileSync } = await import('node:fs');
    const edge = readFileSync(join(viewsRoot, 'partials/fields/rich-editor.edge'), 'utf8');
    assert.match(edge, /editorMode/);
    assert.match(edge, /data-shamar-rich-mode/);
    assert.match(edge, /simple/);
    assert.match(edge, /notion/);
    assert.match(edge, /document/);
    const ui = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../assets/shamar-ui.js'),
      'utf8',
    );
    assert.match(ui, /mountDocumentEditor/);
    assert.match(ui, /mountNotionEditor/);
    assert.match(ui, /mountSimpleEditor/);
    assert.match(ui, /assets\/rich-editor\/simple\.js/);
  });
});

describe('field payload', () => {
  it('parses repeater and keyValue JSON', () => {
    const repeater = parseFieldPayload(
      { name: 'items', type: 'repeater' },
      { items: JSON.stringify([{ sku: 'A' }]) },
    );
    assert.deepEqual(repeater, [{ sku: 'A' }]);

    const meta = parseFieldPayload(
      { name: 'meta', type: 'keyValue' },
      { meta: JSON.stringify([{ key: 'color', value: 'red' }]) },
    );
    assert.deepEqual(meta, { color: 'red' });
  });

  it('accepts qs-style numeric objects for repeaters', () => {
    const repeater = parseFieldPayload(
      { name: 'items', type: 'repeater' },
      { items: { 0: { sku: 'A' }, 1: { sku: 'B' } } },
    );
    assert.deepEqual(repeater, [{ sku: 'A' }, { sku: 'B' }]);
  });

  it('coerces key/value records to pairs for form state', () => {
    assert.deepEqual(toKeyValuePairs({ a: 1, b: 'two' }), [
      { key: 'a', value: '1' },
      { key: 'b', value: 'two' },
    ]);
    assert.deepEqual(keyValuePairsToRecord([{ key: 'a', value: '1' }, { key: '', value: 'x' }]), {
      a: '1',
    });
  });

  it('normalizes time and rating defaults', () => {
    assert.equal(toFormDateInputValue('14:05', 'time'), '14:05');
    assert.equal(formInputType({ type: 'time' }), 'time');
    assert.equal(toFormControlValue(null, { type: 'rating', minValue: 0 }), 0);
    assert.deepEqual(toFormControlValue({ k: 'v' }, { type: 'keyValue' }), [{ key: 'k', value: 'v' }]);
    assert.deepEqual(defaultFormValue({ name: 'tags', type: 'tags' }), []);
  });
});
