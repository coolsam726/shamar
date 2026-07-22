import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildRecordPager, recordNavQuery } from '../src/shamar/list-query.js';

describe('record pager', () => {
  it('builds cyclic prev/next urls', () => {
    const pager = buildRecordPager({
      basePath: '/admin',
      slug: 'companies',
      recordId: 'b',
      mode: 'edit',
      ids: ['a', 'b', 'c'],
      navQuery: '?search=acme',
    });

    assert.ok(pager);
    assert.equal(pager!.index, 2);
    assert.equal(pager!.total, 3);
    assert.equal(pager!.prevUrl, '/admin/companies/a/edit?search=acme');
    assert.equal(pager!.nextUrl, '/admin/companies/c/edit?search=acme');
  });

  it('wraps at list ends', () => {
    const pager = buildRecordPager({
      basePath: '/admin',
      slug: 'companies',
      recordId: 'a',
      mode: 'show',
      ids: ['a', 'b', 'c'],
    });

    assert.equal(pager!.prevUrl, '/admin/companies/c');
    assert.equal(pager!.nextUrl, '/admin/companies/b');
  });

  it('returns null when record is outside the set', () => {
    assert.equal(
      buildRecordPager({
        basePath: '/admin',
        slug: 'companies',
        recordId: 'z',
        mode: 'show',
        ids: ['a', 'b'],
      }),
      null,
    );
  });

  it('encodes nav query without page', () => {
    assert.equal(recordNavQuery({ search: 'x', page: 3, sort: 'name', direction: 'asc' }), '?search=x&sort=name&direction=asc');
  });
});
