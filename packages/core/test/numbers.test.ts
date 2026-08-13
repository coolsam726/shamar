import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatCompactNumber } from '../src/index.js';

describe('formatCompactNumber', () => {
  it('formats thousands and millions compactly', () => {
    assert.equal(formatCompactNumber(1_284), '1.3K');
    assert.equal(formatCompactNumber(12_847_320), '12.8M');
    assert.equal(formatCompactNumber(42), '42');
  });

  it('handles non-finite values', () => {
    assert.equal(formatCompactNumber(Number.NaN), '—');
    assert.equal(formatCompactNumber(Number.POSITIVE_INFINITY), '—');
  });
});
