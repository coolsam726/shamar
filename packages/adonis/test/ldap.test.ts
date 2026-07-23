import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ExternalIdentity } from '@shamar/cherubim';
import {
  authenticateLdap,
  isLdapTimeoutError,
  LDAP_TIMEOUT_MESSAGE,
  LdapTimeoutError,
  orderLdapDomains,
  resolveAuthLoginMode,
  resolvePasswordLogin,
  type LdapDirectoryClient,
  type LdapDomainConfig,
} from '../src/auth/ldap.js';

const corp: LdapDomainConfig = {
  id: 'corp',
  url: 'ldaps://corp.example',
  searchBase: 'dc=corp,dc=example',
  searchFilter: '(uid={{username}})',
  emailDomains: ['corp.example'],
  netbios: 'CORP',
};

const partners: LdapDomainConfig = {
  id: 'partners',
  url: 'ldaps://partners.example',
  searchBase: 'dc=partners,dc=example',
  searchFilter: '(uid={{username}})',
  emailDomains: ['partners.example'],
  netbios: 'PARTNERS',
};

function mockClient(
  handlers: Record<string, (username: string, password: string) => Promise<ExternalIdentity | null>>,
): LdapDirectoryClient {
  return {
    async authenticate(username, password, domain) {
      const handler = handlers[domain.id];
      if (!handler) return null;
      return handler(username, password);
    },
  };
}

const ldapIdentity: ExternalIdentity = {
  provider: 'ldap',
  domainId: 'corp',
  subject: 'cn=jdoe,dc=corp',
  username: 'jdoe',
  email: 'jdoe@corp.example',
  groups: [],
};

describe('LDAP multi-domain login', () => {
  it('defaults loginMode from domains', () => {
    assert.equal(resolveAuthLoginMode(undefined, []), 'local');
    assert.equal(resolveAuthLoginMode(undefined, [corp]), 'both');
    assert.equal(resolveAuthLoginMode('ldap', [corp]), 'ldap');
  });

  it('orders domains by username hints', () => {
    const ordered = orderLdapDomains('jdoe@partners.example', [corp, partners]);
    assert.deepEqual(
      ordered.map((d) => d.id),
      ['partners', 'corp'],
    );
    const netbios = orderLdapDomains('CORP\\jdoe', [partners, corp]);
    assert.equal(netbios[0]!.id, 'corp');
  });

  it('authenticates against the first matching domain', async () => {
    const client = mockClient({
      corp: async () => null,
      partners: async (username) => ({
        provider: 'ldap',
        domainId: 'partners',
        subject: `cn=${username},dc=partners`,
        username,
        email: `${username}@partners.example`,
        groups: [],
      }),
    });

    const result = await authenticateLdap(
      'jdoe@partners.example',
      'secret',
      [corp, partners],
      client,
    );
    assert.ok(result.identity);
    assert.equal(result.timedOut, false);
    assert.equal(result.identity!.domainId, 'partners');
    assert.equal(result.identity!.username, 'jdoe');
  });

  it('ldap-only mode does not fall back to local', async () => {
    const result = await resolvePasswordLogin({
      username: 'local@example.com',
      password: 'secret',
      loginMode: 'ldap',
      domains: [corp],
      client: mockClient({ corp: async () => null }),
      verifyLocal: async () => ({ id: 'local-1' }),
      linkFromLdap: async () => ({ id: 'ldap-1' }),
    });
    assert.equal(result.ok, false);
  });

  it('both mode falls back to local when LDAP misses', async () => {
    const result = await resolvePasswordLogin({
      username: 'local@example.com',
      password: 'secret',
      loginMode: 'both',
      domains: [corp],
      client: mockClient({ corp: async () => null }),
      verifyLocal: async () => ({ id: 'local-1' }),
      linkFromLdap: async () => ({ id: 'ldap-1' }),
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.method, 'local');
      assert.equal(result.user.id, 'local-1');
    }
  });

  it('both mode prefers LDAP when domain succeeds and local user is linked', async () => {
    const result = await resolvePasswordLogin({
      username: 'jdoe',
      password: 'secret',
      loginMode: 'both',
      domains: [corp],
      client: mockClient({
        corp: async () => ldapIdentity,
      }),
      verifyLocal: async () => ({ id: 'local-1' }),
      linkFromLdap: async (identity) => ({
        id: `ldap-${identity.domainId}`,
      }),
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.method, 'ldap');
      assert.equal(result.user.id, 'ldap-corp');
    }
  });

  it('existing provisioning rejects unbound LDAP users in ldap-only mode', async () => {
    const result = await resolvePasswordLogin({
      username: 'jdoe',
      password: 'secret',
      loginMode: 'ldap',
      provisioning: 'existing',
      domains: [corp],
      client: mockClient({ corp: async () => ldapIdentity }),
      verifyLocal: async () => ({ id: 'local-1' }),
      linkFromLdap: async () => null,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.message, /No local account/i);
    }
  });

  it('existing provisioning falls back to local in both mode when not linked', async () => {
    const result = await resolvePasswordLogin({
      username: 'jdoe',
      password: 'secret',
      loginMode: 'both',
      provisioning: 'existing',
      domains: [corp],
      client: mockClient({ corp: async () => ldapIdentity }),
      verifyLocal: async () => ({ id: 'local-1' }),
      linkFromLdap: async () => null,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.method, 'local');
    }
  });

  it('detects timeout-like errors', () => {
    assert.equal(isLdapTimeoutError(new LdapTimeoutError('corp')), true);
    assert.equal(
      isLdapTimeoutError(Object.assign(new Error('connect timeout'), { code: 'ETIMEDOUT' })),
      true,
    );
    assert.equal(isLdapTimeoutError(new Error('Invalid credentials')), false);
  });

  it('reports timeout in ldap-only mode', async () => {
    const result = await resolvePasswordLogin({
      username: 'jdoe',
      password: 'secret',
      loginMode: 'ldap',
      domains: [corp],
      client: {
        async authenticate() {
          throw new LdapTimeoutError('corp');
        },
      },
      verifyLocal: async () => ({ id: 'local-1' }),
      linkFromLdap: async () => ({ id: 'ldap-1' }),
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, 'ldap_timeout');
      assert.equal(result.message, LDAP_TIMEOUT_MESSAGE);
    }
  });

  it('reports timeout in both mode when local also fails', async () => {
    const result = await resolvePasswordLogin({
      username: 'jdoe',
      password: 'secret',
      loginMode: 'both',
      domains: [corp],
      client: {
        async authenticate() {
          throw new LdapTimeoutError('corp');
        },
      },
      verifyLocal: async () => null,
      linkFromLdap: async () => ({ id: 'ldap-1' }),
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, 'ldap_timeout');
      assert.equal(result.message, LDAP_TIMEOUT_MESSAGE);
    }
  });
});
