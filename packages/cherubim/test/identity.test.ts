import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ldapExternalId,
  mapGroupsToRoleIds,
  mergeExternalRoles,
  parseLdapUsername,
  sanitizeStringIds,
} from '../src/identity.js';

describe('LDAP identity helpers', () => {
  it('parses DOMAIN\\user and user@domain', () => {
    assert.deepEqual(parseLdapUsername('CORP\\jdoe'), {
      username: 'jdoe',
      netbios: 'CORP',
      raw: 'CORP\\jdoe',
    });
    assert.deepEqual(parseLdapUsername('jdoe@corp.example'), {
      username: 'jdoe',
      emailDomain: 'corp.example',
      raw: 'jdoe@corp.example',
    });
    assert.deepEqual(parseLdapUsername('plainuser'), {
      username: 'plainuser',
      raw: 'plainuser',
    });
  });

  it('maps groups to role ids and merges with existing roles', () => {
    const mapped = mapGroupsToRoleIds(
      ['CN=Admins,OU=Groups,DC=corp', 'CN=Users,OU=Groups,DC=corp'],
      {
        'CN=Admins,OU=Groups,DC=corp': 'role-admin',
      },
    );
    assert.deepEqual(mapped, ['role-admin']);
    assert.deepEqual(mergeExternalRoles(['role-viewer'], mapped), [
      'role-viewer',
      'role-admin',
    ]);
  });

  it('strips invalid role ids like null casts', () => {
    assert.deepEqual(sanitizeStringIds([null, 'null', 'undefined', '', ' role-a ']), [
      'role-a',
    ]);
    assert.deepEqual(mergeExternalRoles(['null', null as unknown as string, ''], ['role-a']), [
      'role-a',
    ]);
    assert.deepEqual(
      [null, undefined, 'x'].map((item) => String(item)).filter(Boolean),
      ['null', 'undefined', 'x'],
    );
  });

  it('builds stable ldap external ids', () => {
    assert.equal(
      ldapExternalId({ domainId: 'corp', subject: 'cn=jdoe,dc=corp' }),
      'ldap:corp:cn=jdoe,dc=corp',
    );
  });
});
