import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  LIST_PER_PAGE_COOKIE_PREFIX,
  LIST_PER_PAGE_LOCAL_PREFIX,
  listPerPageCookieName,
  listPerPageStorageKey,
  parseStoredPerPage,
  resolvePerPageFromQueryAndCookie,
} from '../src/shamar/list-per-page-persist.js';

describe('list per-page persistence keys', () => {
  it('scopes localStorage and cookie by panel + resource', () => {
    assert.equal(
      listPerPageStorageKey('admin', 'users'),
      `${LIST_PER_PAGE_LOCAL_PREFIX}admin:users`,
    );
    assert.equal(
      listPerPageCookieName('admin', 'users'),
      `${LIST_PER_PAGE_COOKIE_PREFIX}admin_users`,
    );
  });

  it('sanitizes unsafe characters in cookie names', () => {
    assert.equal(
      listPerPageCookieName('acme/admin', 'unit.lessons'),
      `${LIST_PER_PAGE_COOKIE_PREFIX}acme_admin_unit_lessons`,
    );
  });
});

describe('parseStoredPerPage', () => {
  it('accepts toolbar choices and all', () => {
    assert.equal(parseStoredPerPage(20), '20');
    assert.equal(parseStoredPerPage('25'), '25');
    assert.equal(parseStoredPerPage('all'), 'all');
    assert.equal(parseStoredPerPage('ALL'), 'all');
    assert.equal(parseStoredPerPage(1000), 'all');
  });

  it('rejects missing or invalid values', () => {
    assert.equal(parseStoredPerPage(undefined), null);
    assert.equal(parseStoredPerPage(''), null);
    assert.equal(parseStoredPerPage('nope'), null);
    assert.equal(parseStoredPerPage(3), null);
  });
});

describe('resolvePerPageFromQueryAndCookie', () => {
  it('prefers query over cookie', () => {
    assert.equal(resolvePerPageFromQueryAndCookie(20, '50'), '20');
    assert.equal(resolvePerPageFromQueryAndCookie('all', '15'), 'all');
  });

  it('falls back to cookie when query is absent', () => {
    assert.equal(resolvePerPageFromQueryAndCookie(undefined, '20'), '20');
    assert.equal(resolvePerPageFromQueryAndCookie('', 'all'), 'all');
    assert.equal(resolvePerPageFromQueryAndCookie(null, null), undefined);
  });

  it('leaves first visit without preference as undefined (default 15)', () => {
    assert.equal(resolvePerPageFromQueryAndCookie(undefined, undefined), undefined);
  });
});
