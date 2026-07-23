import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveContentMaxWidth } from '../src/content-max-width.js';

describe('resolveContentMaxWidth', () => {
  it('defaults to max-w-5xl', () => {
    assert.deepEqual(resolveContentMaxWidth(), { className: 'max-w-5xl' });
    assert.deepEqual(resolveContentMaxWidth(null), { className: 'max-w-5xl' });
    assert.deepEqual(resolveContentMaxWidth(''), { className: 'max-w-5xl' });
  });

  it('maps Tailwind tokens to classes', () => {
    assert.deepEqual(resolveContentMaxWidth('7xl'), { className: 'max-w-7xl' });
    assert.deepEqual(resolveContentMaxWidth('full'), { className: 'max-w-full' });
    assert.deepEqual(resolveContentMaxWidth('none'), { className: 'max-w-none' });
  });

  it('passes through max-w-* classes', () => {
    assert.deepEqual(resolveContentMaxWidth('max-w-3xl'), { className: 'max-w-3xl' });
  });

  it('uses inline style for CSS lengths', () => {
    assert.deepEqual(resolveContentMaxWidth('80rem'), {
      className: 'w-full max-w-none',
      style: 'max-width: 80rem',
    });
    assert.deepEqual(resolveContentMaxWidth('1200px'), {
      className: 'w-full max-w-none',
      style: 'max-width: 1200px',
    });
  });
});
