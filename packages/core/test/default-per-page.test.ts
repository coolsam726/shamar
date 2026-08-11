import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_LIST_PER_PAGE,
  resolveDefaultPerPage,
  resolvePerPageOptions,
} from '../src/default-per-page.js';

describe('resolveDefaultPerPage', () => {
  it('falls back to 15', () => {
    assert.equal(resolveDefaultPerPage(), DEFAULT_LIST_PER_PAGE);
    assert.equal(resolveDefaultPerPage(undefined, undefined), 15);
  });

  it('prefers resource over panel', () => {
    assert.equal(resolveDefaultPerPage(10, 25), 10);
    assert.equal(resolveDefaultPerPage(undefined, 25), 25);
  });

  it('rejects invalid values', () => {
    assert.equal(resolveDefaultPerPage(0, 25), 25);
    assert.equal(resolveDefaultPerPage(-1), 15);
    assert.equal(resolveDefaultPerPage(Number.NaN), 15);
  });
});

describe('resolvePerPageOptions', () => {
  it('includes a custom default', () => {
    assert.deepEqual(resolvePerPageOptions(30), [10, 15, 20, 25, 30, 50]);
  });
});
