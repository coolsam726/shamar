import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assignFieldFormState,
  dehydrateField,
  emptyFieldValue,
  emptyRepeaterItem,
  FIELD_ABSENT,
  FIELD_SKIP,
  fieldFormState,
  getFieldType,
  hydrateField,
  registerFieldType,
} from '../src/index.js';
import type { FieldConfig } from '../src/index.js';

function field(partial: Partial<FieldConfig> & Pick<FieldConfig, 'name' | 'type'>): FieldConfig {
  return partial;
}

describe('field hydrate / dehydrate', () => {
  it('hydrates dates, keyValue pairs, and rating defaults', () => {
    assert.equal(hydrateField({ type: 'time' }, '14:05'), '14:05');
    assert.deepEqual(hydrateField({ type: 'keyValue' }, { k: 'v' }), [{ key: 'k', value: 'v' }]);
    assert.equal(hydrateField({ type: 'rating', minValue: 0 }, null), 0);
    assert.deepEqual(hydrateField({ type: 'tags' }, null), []);
  });

  it('dehydrates request payloads per field type', () => {
    assert.equal(dehydrateField(field({ name: 'on', type: 'boolean' }), {}), false);
    assert.equal(dehydrateField(field({ name: 'on', type: 'boolean' }), { on: '1' }), true);

    assert.deepEqual(
      dehydrateField(field({ name: 'items', type: 'repeater' }), {
        items: JSON.stringify([{ sku: 'A' }]),
      }),
      [{ sku: 'A' }],
    );

    assert.deepEqual(
      dehydrateField(field({ name: 'items', type: 'repeater' }), {
        items: { 0: { sku: 'A' }, 1: { sku: 'B' } },
      }),
      [{ sku: 'A' }, { sku: 'B' }],
    );

    assert.deepEqual(
      dehydrateField(field({ name: 'meta', type: 'keyValue' }), {
        meta: JSON.stringify([{ key: 'color', value: 'red' }]),
      }),
      { color: 'red' },
    );

    assert.deepEqual(
      dehydrateField(field({ name: 'tags', type: 'tags' }), { tags: 'a, b' }),
      ['a', 'b'],
    );

    assert.equal(
      dehydrateField(field({ name: 'title', type: 'text' }), { body: 'x' }),
      FIELD_ABSENT,
    );
  });

  it('uses empty values that skip belongsTo combobox state', () => {
    assert.equal(emptyFieldValue({ type: 'boolean' }), false);
    assert.equal(emptyFieldValue({ type: 'color' }), '#000000');
    assert.deepEqual(emptyFieldValue({ type: 'tags' }), []);
    assert.equal(
      emptyFieldValue({
        type: 'relation',
        relation: { kind: 'belongsTo', resource: 'users', labelField: 'name' },
      }),
      FIELD_SKIP,
    );
  });

  it('lets custom field types own hydrate and dehydrate', () => {
    registerFieldType({
      type: 'signature',
      valueKind: 'scalar',
      hydrate: (value) => (value == null ? '' : `ink:${value}`),
      dehydrate: (field, input) => {
        const raw = input[field.name];
        if (raw == null || raw === '') return FIELD_ABSENT;
        return String(raw).replace(/^ink:/, '');
      },
      empty: () => '',
    });

    assert.equal(hydrateField({ type: 'signature' }, 'abc'), 'ink:abc');
    assert.equal(
      dehydrateField(field({ name: 'sign', type: 'signature' }), { sign: 'ink:abc' }),
      'abc',
    );
    assert.equal(emptyFieldValue({ type: 'signature' }), '');
    assert.equal(getFieldType('signature')?.valueKind, 'scalar');
  });

  it('seeds form state from a record without type switches', () => {
    const state: Record<string, unknown> = {};
    assignFieldFormState(state, field({ name: 'title', type: 'text' }), { title: 'Hello' });
    assignFieldFormState(state, field({ name: 'published', type: 'boolean' }), {});
    assignFieldFormState(
      state,
      field({
        name: 'authorId',
        type: 'relation',
        relation: { kind: 'belongsTo', resource: 'users', labelField: 'name' },
      }),
      {},
    );

    assert.equal(state.title, 'Hello');
    assert.equal(state.published, false);
    assert.equal('authorId' in state, false);
    assert.equal(fieldFormState(field({ name: 'title', type: 'text', default: 'Draft' }), null), 'Draft');
  });

  it('builds empty repeater items from nested field types', () => {
    const item = emptyRepeaterItem({
      fields: [
        field({ name: 'sku', type: 'text' }),
        field({ name: 'on', type: 'boolean' }),
      ],
    });
    assert.deepEqual(item, { sku: '', on: false });
  });
});
