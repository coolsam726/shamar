import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  humanizeLabel,
  TextInput,
  TextColumn,
  TextEntry,
  formatCurrencyValue,
} from '../src/index.js';

describe('humanizeLabel', () => {
  it('splits camelCase and snake_case', () => {
    assert.equal(humanizeLabel('startsAt'), 'Starts At');
    assert.equal(humanizeLabel('starts_at'), 'Starts At');
    assert.equal(humanizeLabel('end-date'), 'End Date');
  });

  it('preserves acronym-like tokens', () => {
    assert.equal(humanizeLabel('SKU'), 'SKU');
    assert.equal(humanizeLabel('htmlURL'), 'Html URL');
  });
});

describe('currency helpers', () => {
  it('formats values with Intl currency style', () => {
    const formatted = formatCurrencyValue(1234.5, { code: 'USD', precision: 2 });
    assert.ok(formatted);
    assert.match(formatted!, /1/);
    assert.match(formatted!, /234/);
  });

  it('marks TextInput / TextColumn / TextEntry as currency', () => {
    const field = TextInput.make('price').currency('USD').build();
    assert.equal(field.type, 'number');
    assert.equal(field.currency?.code, 'USD');
    assert.equal(field.currency?.precision, 2);
    assert.ok(field.prefix);

    const column = TextColumn.make('price').currency('EUR', { precision: 0 }).build();
    assert.equal(column.format, 'currency');
    assert.equal(column.currency?.code, 'EUR');
    assert.equal(column.currency?.precision, 0);

    const entry = TextEntry.make('price').currency({ code: 'GBP', locale: 'en-GB' }).build();
    assert.equal(entry.format, 'currency');
    assert.equal(entry.currency?.code, 'GBP');
  });
});
