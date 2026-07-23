import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canAccessPanel,
  userHasAuthorization,
} from '../src/shamar/auth.js';

describe('panel access gate', () => {
  it('denies users with no roles and no permissions by default', () => {
    assert.equal(userHasAuthorization({ id: '1', name: 'Empty', roleIds: [], permissions: [] }), false);
    assert.equal(
      canAccessPanel({ id: '1', name: 'Empty', roleIds: [], permissions: [] }, {}),
      false,
    );
  });

  it('allows users with roles or direct permissions', () => {
    assert.equal(
      canAccessPanel({ id: '1', name: 'R', roleIds: ['role-1'], permissions: [] }, {}),
      true,
    );
    assert.equal(
      canAccessPanel({ id: '1', name: 'P', roleIds: [], permissions: ['posts:viewAny'] }, {}),
      true,
    );
  });

  it('ignores bogus role id strings like "null"', () => {
    assert.equal(
      canAccessPanel({ id: '1', name: 'Bad', roleIds: ['null'], permissions: [] }, {}),
      false,
    );
  });
});
