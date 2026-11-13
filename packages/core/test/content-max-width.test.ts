import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MaxWidth,
  MaxContentWidth,
  MAX_CONTENT_WIDTH_ALIASES,
  normalizeMaxContentWidth,
  resolveContentMaxWidth,
} from '../src/content-max-width.js';
import { panel } from '../src/panel.js';

describe('resolveContentMaxWidth', () => {
  it('defaults to max-w-screen-xl with inline max-width', () => {
    assert.deepEqual(resolveContentMaxWidth(), {
      className: 'w-full max-w-screen-xl',
      style: 'max-width: 80rem',
    });
    assert.deepEqual(resolveContentMaxWidth(null), {
      className: 'w-full max-w-screen-xl',
      style: 'max-width: 80rem',
    });
    assert.deepEqual(resolveContentMaxWidth(''), {
      className: 'w-full max-w-screen-xl',
      style: 'max-width: 80rem',
    });
  });

  it('maps screen tokens to container classes + inline style', () => {
    assert.deepEqual(resolveContentMaxWidth('screen-sm'), {
      className: 'w-full max-w-screen-sm',
      style: 'max-width: 40rem',
    });
    assert.deepEqual(resolveContentMaxWidth('screen-md'), {
      className: 'w-full max-w-screen-md',
      style: 'max-width: 48rem',
    });
    assert.deepEqual(resolveContentMaxWidth('screen-lg'), {
      className: 'w-full max-w-screen-lg',
      style: 'max-width: 64rem',
    });
    assert.deepEqual(resolveContentMaxWidth('screen-2xl'), {
      className: 'w-full max-w-screen-2xl',
      style: 'max-width: 96rem',
    });
  });

  it('maps Filament BC aliases to Tailwind classes + inline style', () => {
    assert.deepEqual(resolveContentMaxWidth('container'), {
      className: 'w-full container',
    });
    assert.deepEqual(resolveContentMaxWidth('prose'), {
      className: 'w-full max-w-prose',
      style: 'max-width: 65ch',
    });
    assert.deepEqual(resolveContentMaxWidth('screen-s'), {
      className: 'w-full max-w-screen-sm',
      style: 'max-width: 40rem',
    });
    assert.deepEqual(resolveContentMaxWidth('screen-m'), {
      className: 'w-full max-w-screen-md',
      style: 'max-width: 48rem',
    });
    assert.deepEqual(resolveContentMaxWidth('screen-l'), {
      className: 'w-full max-w-screen-lg',
      style: 'max-width: 64rem',
    });
    assert.deepEqual(resolveContentMaxWidth('screen-xl'), {
      className: 'w-full max-w-screen-xl',
      style: 'max-width: 80rem',
    });
    assert.deepEqual(resolveContentMaxWidth('screen-2xl'), {
      className: 'w-full max-w-screen-2xl',
      style: 'max-width: 96rem',
    });
  });

  it('maps primary Tailwind scale tokens sm/md/lg + Sm/Md/Lg enum', () => {
    assert.deepEqual(resolveContentMaxWidth('sm'), {
      className: 'w-full max-w-sm',
      style: 'max-width: 24rem',
    });
    assert.deepEqual(resolveContentMaxWidth('md'), {
      className: 'w-full max-w-md',
      style: 'max-width: 28rem',
    });
    assert.deepEqual(resolveContentMaxWidth('lg'), {
      className: 'w-full max-w-lg',
      style: 'max-width: 32rem',
    });
    assert.deepEqual(resolveContentMaxWidth(MaxWidth.Sm), {
      className: 'w-full max-w-sm',
      style: 'max-width: 24rem',
    });
    assert.deepEqual(resolveContentMaxWidth(MaxWidth.Md), {
      className: 'w-full max-w-md',
      style: 'max-width: 28rem',
    });
    assert.deepEqual(resolveContentMaxWidth(MaxWidth.Lg), {
      className: 'w-full max-w-lg',
      style: 'max-width: 32rem',
    });
    assert.equal(MaxWidth.Sm, 'sm');
    assert.equal(MaxWidth.Md, 'md');
    assert.equal(MaxWidth.Lg, 'lg');
    assert.equal(MaxWidth.Small, 'sm');
    assert.equal(MaxWidth.Medium, 'md');
    assert.equal(MaxWidth.Large, 'lg');
  });

  it('keeps Filament short s/m/l as BC aliases', () => {
    assert.deepEqual(resolveContentMaxWidth('s'), {
      className: 'w-full max-w-sm',
      style: 'max-width: 24rem',
    });
    assert.deepEqual(resolveContentMaxWidth('m'), {
      className: 'w-full max-w-md',
      style: 'max-width: 28rem',
    });
    assert.deepEqual(resolveContentMaxWidth('l'), {
      className: 'w-full max-w-lg',
      style: 'max-width: 32rem',
    });
    assert.deepEqual(resolveContentMaxWidth(MaxWidth.S), {
      className: 'w-full max-w-sm',
      style: 'max-width: 24rem',
    });
    assert.deepEqual(resolveContentMaxWidth(MaxWidth.M), {
      className: 'w-full max-w-md',
      style: 'max-width: 28rem',
    });
    assert.deepEqual(resolveContentMaxWidth(MaxWidth.L), {
      className: 'w-full max-w-lg',
      style: 'max-width: 32rem',
    });
  });

  it('exposes alias → canonical map used by normalize (Filament BC only)', () => {
    assert.equal(MAX_CONTENT_WIDTH_ALIASES.s, 'sm');
    assert.equal(MAX_CONTENT_WIDTH_ALIASES.m, 'md');
    assert.equal(MAX_CONTENT_WIDTH_ALIASES.l, 'lg');
    assert.equal(MAX_CONTENT_WIDTH_ALIASES['screen-s'], 'screen-sm');
    assert.equal(MAX_CONTENT_WIDTH_ALIASES['screen-m'], 'screen-md');
    assert.equal(MAX_CONTENT_WIDTH_ALIASES['screen-l'], 'screen-lg');
    assert.equal(MAX_CONTENT_WIDTH_ALIASES.container, undefined);
    assert.equal(MAX_CONTENT_WIDTH_ALIASES.prose, undefined);
    assert.equal(normalizeMaxContentWidth('s'), 'sm');
    assert.equal(normalizeMaxContentWidth('m'), 'md');
    assert.equal(normalizeMaxContentWidth('l'), 'lg');
    assert.equal(normalizeMaxContentWidth('sm'), 'sm');
    assert.equal(normalizeMaxContentWidth('md'), 'md');
    assert.equal(normalizeMaxContentWidth('lg'), 'lg');
    assert.equal(normalizeMaxContentWidth('screen-s'), 'screen-sm');
    assert.equal(normalizeMaxContentWidth('screen-m'), 'screen-md');
    assert.equal(normalizeMaxContentWidth('screen-l'), 'screen-lg');
    assert.equal(normalizeMaxContentWidth('screen-sm'), 'screen-sm');
    assert.equal(normalizeMaxContentWidth('container'), 'container');
    assert.equal(normalizeMaxContentWidth('7xl'), '7xl');
    assert.equal(normalizeMaxContentWidth(''), 'screen-xl');
  });

  it('maps Tailwind scale tokens to classes + inline style', () => {
    assert.deepEqual(resolveContentMaxWidth('7xl'), {
      className: 'w-full max-w-7xl',
      style: 'max-width: 80rem',
    });
    assert.deepEqual(resolveContentMaxWidth('full'), {
      className: 'w-full max-w-full',
      style: 'max-width: 100%',
    });
    assert.deepEqual(resolveContentMaxWidth('none'), {
      className: 'w-full max-w-none',
      style: 'max-width: none',
    });
    assert.deepEqual(resolveContentMaxWidth('min'), {
      className: 'w-full max-w-min',
      style: 'max-width: min-content',
    });
    assert.deepEqual(resolveContentMaxWidth('max'), {
      className: 'w-full max-w-max',
      style: 'max-width: max-content',
    });
    assert.deepEqual(resolveContentMaxWidth('fit'), {
      className: 'w-full max-w-fit',
      style: 'max-width: fit-content',
    });
    assert.deepEqual(resolveContentMaxWidth(MaxWidth.SevenExtraLarge), {
      className: 'w-full max-w-7xl',
      style: 'max-width: 80rem',
    });
    assert.deepEqual(resolveContentMaxWidth(MaxContentWidth['7XL']), {
      className: 'w-full max-w-7xl',
      style: 'max-width: 80rem',
    });
  });

  it('passes through max-w-* classes (BC) with matching inline style', () => {
    assert.deepEqual(resolveContentMaxWidth('max-w-screen-xl'), {
      className: 'w-full max-w-screen-xl',
      style: 'max-width: 80rem',
    });
    assert.deepEqual(resolveContentMaxWidth('max-w-3xl'), {
      className: 'w-full max-w-3xl',
      style: 'max-width: 48rem',
    });
    assert.deepEqual(resolveContentMaxWidth('max-w-prose'), {
      className: 'w-full max-w-prose',
      style: 'max-width: 65ch',
    });
  });

  it('converts bare […] arbitrary tokens to inline style', () => {
    assert.deepEqual(resolveContentMaxWidth('[80rem]'), {
      className: 'w-full max-w-none',
      style: 'max-width: 80rem',
    });
    assert.deepEqual(resolveContentMaxWidth('[800px]'), {
      className: 'w-full max-w-none',
      style: 'max-width: 800px',
    });
    assert.deepEqual(resolveContentMaxWidth('[1200px]'), {
      className: 'w-full max-w-none',
      style: 'max-width: 1200px',
    });
  });

  it('converts arbitrary max-w-[…] to inline style (purge-safe BC)', () => {
    assert.deepEqual(resolveContentMaxWidth('max-w-[80rem]'), {
      className: 'w-full max-w-none',
      style: 'max-width: 80rem',
    });
    assert.deepEqual(resolveContentMaxWidth('max-w-[1200px]'), {
      className: 'w-full max-w-none',
      style: 'max-width: 1200px',
    });
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

describe('PanelBuilder.maxContentWidth', () => {
  it('stores via Filament alias method', () => {
    const config = panel('admin').maxContentWidth('screen-2xl').build();
    assert.equal(config.contentMaxWidth, 'screen-2xl');
  });

  it('accepts MaxWidth const tokens', () => {
    const config = panel('admin').maxContentWidth(MaxWidth.Container).build();
    assert.equal(config.contentMaxWidth, 'container');
    assert.deepEqual(resolveContentMaxWidth(config.contentMaxWidth), {
      className: 'w-full container',
    });
  });

  it('accepts MaxWidth.ScreenLg / Sm / Prose / Screen2Xl', () => {
    assert.equal(
      panel('admin').maxContentWidth(MaxWidth.ScreenLg).build().contentMaxWidth,
      'screen-lg',
    );
    assert.equal(
      panel('admin').maxContentWidth(MaxWidth.ScreenLarge).build().contentMaxWidth,
      'screen-lg',
    );
    assert.deepEqual(resolveContentMaxWidth(MaxWidth.ScreenLg), {
      className: 'w-full max-w-screen-lg',
      style: 'max-width: 64rem',
    });
    assert.deepEqual(resolveContentMaxWidth(MaxWidth.ScreenSm), {
      className: 'w-full max-w-screen-sm',
      style: 'max-width: 40rem',
    });
    assert.deepEqual(resolveContentMaxWidth(MaxWidth.Prose), {
      className: 'w-full max-w-prose',
      style: 'max-width: 65ch',
    });
    assert.deepEqual(resolveContentMaxWidth(MaxWidth.ScreenL), {
      className: 'w-full max-w-screen-lg',
      style: 'max-width: 64rem',
    });
    assert.equal(
      panel('admin').maxContentWidth(MaxWidth.Screen2Xl).build().contentMaxWidth,
      'screen-2xl',
    );
    assert.deepEqual(resolveContentMaxWidth(MaxWidth.Screen2Xl), {
      className: 'w-full max-w-screen-2xl',
      style: 'max-width: 96rem',
    });
    assert.deepEqual(resolveContentMaxWidth(MaxWidth.ScreenTwoExtraLarge), {
      className: 'w-full max-w-screen-2xl',
      style: 'max-width: 96rem',
    });
  });
});
