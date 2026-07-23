import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isMasqueradeEnabled,
  isMasqueradePassword,
  isMasqueradeSession,
  MASQUERADE_SESSION_KEY,
  passwordsMatch,
} from '../src/auth/masquerade.js';
import { buildAuthLoginViewData } from '../src/auth_login_view.js';
import { buildShellContext } from '../src/shamar/view-context.js';
import { ResourceRegistry } from '@shamar/core';

describe('masquerade helpers', () => {
  const withPassword = { auth: { masquerade: { password: 'dev-secret' } } };

  it('is disabled in production even with a password', () => {
    assert.equal(isMasqueradeEnabled(withPassword, { NODE_ENV: 'production' }), false);
    assert.equal(
      isMasqueradePassword('dev-secret', withPassword, { NODE_ENV: 'production' }),
      false,
    );
  });

  it('is disabled when password is missing or blank', () => {
    assert.equal(isMasqueradeEnabled({ auth: {} }, { NODE_ENV: 'development' }), false);
    assert.equal(
      isMasqueradeEnabled({ auth: { masquerade: { password: '  ' } } }, { NODE_ENV: 'development' }),
      false,
    );
  });

  it('is enabled in non-production when password is set', () => {
    assert.equal(isMasqueradeEnabled(withPassword, { NODE_ENV: 'development' }), true);
    assert.equal(isMasqueradeEnabled(withPassword, { NODE_ENV: 'test' }), true);
  });

  it('compares passwords in a timing-safe way', () => {
    assert.equal(passwordsMatch('dev-secret', 'dev-secret'), true);
    assert.equal(passwordsMatch('dev-secret', 'wrong'), false);
    assert.equal(passwordsMatch('', 'dev-secret'), false);
    assert.equal(passwordsMatch('dev-secret', ''), false);
  });

  it('matches masquerade password only when enabled', () => {
    assert.equal(
      isMasqueradePassword('dev-secret', withPassword, { NODE_ENV: 'development' }),
      true,
    );
    assert.equal(
      isMasqueradePassword('nope', withPassword, { NODE_ENV: 'development' }),
      false,
    );
  });

  it('reads the session flag', () => {
    assert.equal(isMasqueradeSession({ get: () => true }), true);
    assert.equal(isMasqueradeSession({ get: () => false }), false);
    assert.equal(
      isMasqueradeSession({
        get: (key) => (key === MASQUERADE_SESSION_KEY ? true : undefined),
      }),
      true,
    );
  });

  it('exposes masqueradeEnabled on login view data', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const enabled = buildAuthLoginViewData(withPassword);
      assert.equal(enabled.masqueradeEnabled, true);
      const disabled = buildAuthLoginViewData({ auth: {} });
      assert.equal(disabled.masqueradeEnabled, false);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it('passes masquerade into shell context', () => {
    const shell = buildShellContext({
      config: { path: '/admin', resources: [] },
      registry: new ResourceRegistry([]),
      pageTitle: 'Dashboard',
      masquerade: { active: true },
      authCtx: {
        user: { id: '1', name: 'Sam', email: 'sam@example.com', roleIds: [], permissions: [] },
      },
    });
    assert.deepEqual(shell.masquerade, { active: true });
    assert.equal(shell.user.name, 'Sam');
  });
});
