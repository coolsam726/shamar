import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveContentMaxWidth } from '../src/content-max-width.js';

describe('resolveContentMaxWidth', () => {
  it('defaults to max-w-screen-xl', () => {
    assert.deepEqual(resolveContentMaxWidth(), { className: 'w-full max-w-screen-xl' });
    assert.deepEqual(resolveContentMaxWidth(null), { className: 'w-full max-w-screen-xl' });
    assert.deepEqual(resolveContentMaxWidth(''), { className: 'w-full max-w-screen-xl' });
  });

  it('maps screen tokens to container classes', () => {
    assert.deepEqual(resolveContentMaxWidth('screen-lg'), {
      className: 'w-full max-w-screen-lg',
    });
    assert.deepEqual(resolveContentMaxWidth('screen-2xl'), {
      className: 'w-full max-w-screen-2xl',
    });
  });

  it('maps Tailwind scale tokens to classes', () => {
    assert.deepEqual(resolveContentMaxWidth('7xl'), { className: 'w-full max-w-7xl' });
    assert.deepEqual(resolveContentMaxWidth('full'), { className: 'w-full max-w-full' });
    assert.deepEqual(resolveContentMaxWidth('none'), { className: 'w-full max-w-none' });
  });

  it('passes through max-w-* classes', () => {
    assert.deepEqual(resolveContentMaxWidth('max-w-screen-xl'), {
      className: 'w-full max-w-screen-xl',
    });
    assert.deepEqual(resolveContentMaxWidth('max-w-3xl'), { className: 'w-full max-w-3xl' });
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
