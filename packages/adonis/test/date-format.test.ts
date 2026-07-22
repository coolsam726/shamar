import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cellValue,
  detailValue,
  formatDateValue,
  parseDateValue,
  toFormDateInputValue,
  badgeValues,
} from '../src/shamar/list-query.js';

describe('date display formatting', () => {
  it('parses ISO, date-only, Date, and epoch values', () => {
    assert.ok(parseDateValue('2024-01-15T14:30:00.000Z'));
    assert.equal(parseDateValue('2024-01-15')?.getFullYear(), 2024);
    assert.equal(parseDateValue('2024-01-15')?.getMonth(), 0);
    assert.equal(parseDateValue('2024-01-15')?.getDate(), 15);
    assert.ok(parseDateValue(new Date('2024-06-01T12:00:00Z')));
    assert.ok(parseDateValue(Date.parse('2024-06-01T12:00:00Z')));
    assert.equal(parseDateValue('not-a-date'), null);
    assert.equal(parseDateValue(null), null);
  });

  it('formats date and datetime for humans', () => {
    const date = formatDateValue('2024-01-15', 'date');
    const dateTime = formatDateValue('2024-01-15T14:30:00.000Z', 'datetime');

    assert.match(date!, /Jan/);
    assert.match(date!, /15/);
    assert.match(date!, /2024/);
    assert.match(dateTime!, /Jan/);
    assert.match(dateTime!, /2024/);
    // Hour appears in datetime (locale-dependent digits)
    assert.match(dateTime!, /\d/);
  });

  it('formats detail/table values via format or type', () => {
    const record = {
      createdAt: '2024-01-15T14:30:00.000Z',
      birthday: '2024-03-01',
    };

    const asDateTime = detailValue(record, {
      name: 'createdAt',
      type: 'datetime',
      format: 'datetime',
    });
    const asDate = cellValue(record, {
      name: 'birthday',
      format: 'date',
    });

    assert.notEqual(asDateTime, record.createdAt);
    assert.match(asDateTime, /2024/);
    assert.notEqual(asDate, record.birthday);
    assert.match(asDate, /Mar/);
    assert.match(asDate, /2024/);
  });

  it('leaves non-date fields unchanged', () => {
    assert.equal(cellValue({ name: 'Acme' }, { name: 'name', type: 'text' }), 'Acme');
    assert.equal(cellValue({ active: true }, { name: 'active', type: 'boolean' }), 'Yes');
    assert.equal(detailValue({ empty: null }, { name: 'empty' }), '—');
  });

  it('joins array values for plain cell text', () => {
    assert.equal(
      cellValue({ tags: ['a', 'b'] }, { name: 'tags', type: 'tags' }),
      'a, b',
    );
  });

  it('splits array values into badge labels', () => {
    assert.deepEqual(badgeValues({ tags: ['sale', 'new'] }, { name: 'tags' }), [
      'sale',
      'new',
    ]);
    assert.deepEqual(badgeValues({ status: 'open' }, { name: 'status' }), ['open']);
    assert.deepEqual(badgeValues({ tags: [] }, { name: 'tags' }), []);
  });

  it('formats currency columns and entries', () => {
    const formatted = cellValue(
      { price: 19.99 },
      { name: 'price', format: 'currency', currency: { code: 'USD', precision: 2 } },
    );
    assert.match(formatted, /19/);
    assert.notEqual(formatted, '19.99');

    const detail = detailValue(
      { amount: 1000 },
      { name: 'amount', currency: { code: 'USD', precision: 0 } },
    );
    assert.match(detail, /1/);
    assert.equal(cellValue({ price: null }, { name: 'price', format: 'currency' }), '—');
  });

  it('normalizes ISO values for date / datetime-local inputs', () => {
    const dateOnly = toFormDateInputValue('2024-03-01', 'date');
    assert.equal(dateOnly, '2024-03-01');

    const local = toFormDateInputValue('2024-01-15T14:30:00.000Z', 'datetime');
    assert.match(local, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    assert.equal(toFormDateInputValue(null, 'datetime'), '');
  });
});
