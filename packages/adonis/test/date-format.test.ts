import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cellValue,
  detailValue,
  formatDateValue,
  parseDateValue,
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
});
