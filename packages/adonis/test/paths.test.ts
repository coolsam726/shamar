import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { panelPathPrefix, panelSlugMatcher } from '../src/shamar/paths.js';

describe('panelPathPrefix', () => {
  it('treats / and empty as the host root', () => {
    assert.equal(panelPathPrefix('/'), '');
    assert.equal(panelPathPrefix(''), '');
    assert.equal(panelPathPrefix(null), '');
    assert.equal(panelPathPrefix('/demo'), '/demo');
    assert.equal(panelPathPrefix('/demo/'), '/demo');
  });
});

describe('panelSlugMatcher', () => {
  it('only matches registered resource and page slugs', () => {
    const match = panelSlugMatcher(['companies', 'form-components']);
    assert.equal(match.test('companies'), true);
    assert.equal(match.test('form-components'), true);
    assert.equal(match.test('demo'), false);
    assert.equal(match.test('favicon.ico'), false);
    assert.equal(match.test('demo-status'), false);
    assert.equal(match.test('assets'), false);
  });

  it('matches nothing when the panel has no slugs', () => {
    assert.equal(panelSlugMatcher([]).test('companies'), false);
  });
});
