import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractApiKey,
  extractAuthCredentials,
  extractBearerToken,
  extractMachineApiKey,
  generateApiKey,
  hashApiKey,
  intersectPermissions,
  resolveFromApiKey,
  resolvePrincipalFromApiKey,
  resolveUserFromApiKey,
  toCherubimUser,
  type ApiKeyRecord,
  type ApiKeyStore,
} from '../src/index.js';

describe('API credentials (PAT + machine)', () => {
  it('generates a shm_ key with matching hash and prefix', () => {
    const key = generateApiKey();
    assert.match(key.plainText, /^shm_[a-f0-9]{80}$/);
    assert.ok(key.plainText.length >= 40);
    assert.equal(key.tokenHash, hashApiKey(key.plainText));
  });

  it('splits dual credentials: X-Api-Key vs Bearer', () => {
    assert.equal(extractBearerToken({ authorization: 'Bearer shm_pat' }), 'shm_pat');
    assert.equal(extractMachineApiKey({ 'x-api-key': 'shm_machine' }), 'shm_machine');
    assert.equal(extractMachineApiKey({ 'api-key': 'shm_alt' }), 'shm_alt');

    const dual = extractAuthCredentials({
      authorization: 'Bearer shm_pat',
      'x-api-key': 'shm_machine',
    });
    assert.equal(dual.bearer, 'shm_pat');
    assert.equal(dual.apiKey, 'shm_machine');

    // Single-credential fallback prefers Bearer
    assert.equal(extractApiKey({ authorization: 'Bearer shm_abc' }), 'shm_abc');
    assert.equal(extractApiKey({ 'x-api-key': 'shm_x' }), 'shm_x');
  });

  it('intersects PAT abilities with user permissions', () => {
    const narrowed = intersectPermissions(['products:*'], ['products:view', 'orders:edit']);
    assert.ok(narrowed.includes('products:view'));
    assert.equal(narrowed.includes('orders:edit'), false);
    assert.deepEqual(intersectPermissions(['a', 'b'], []), ['a', 'b']);
  });

  it('resolves machine keys as standalone principals', async () => {
    const generated = generateApiKey();
    const store = memoryStore([
      {
        id: 'm1',
        tokenHash: generated.tokenHash,
        kind: 'machine',
        name: 'iOS',
        abilities: ['products:view'],
      },
    ]);

    const principal = await resolvePrincipalFromApiKey(generated.plainText, store);
    assert.equal(principal?.id, 'apikey:m1');
    assert.deepEqual(principal?.permissions, ['products:view']);
  });

  it('resolves PATs as the owning user', async () => {
    const generated = generateApiKey();
    const store = memoryStore([
      {
        id: 'p1',
        tokenHash: generated.tokenHash,
        kind: 'pat',
        userId: 'user-1',
        abilities: ['products:view'],
      },
    ]);

    const user = await resolveUserFromApiKey(generated.plainText, store, async (id) =>
      id === 'user-1'
        ? toCherubimUser({
            id: 'user-1',
            name: 'Ada',
            permissions: ['products:*'],
            roleIds: ['role-1'],
          })
        : null,
    );

    assert.equal(user?.id, 'user-1');
    assert.equal(user?.apiKeyId, 'p1');
    assert.deepEqual(user?.apiKeyAbilities, ['products:view']);
  });

  it('resolveFromApiKey dispatches by kind', async () => {
    const machine = generateApiKey();
    const pat = generateApiKey();
    const store = memoryStore([
      {
        id: 'm1',
        tokenHash: machine.tokenHash,
        kind: 'machine',
        abilities: ['*'],
        name: 'bot',
      },
      {
        id: 'p1',
        tokenHash: pat.tokenHash,
        kind: 'pat',
        userId: 'u1',
        abilities: [],
      },
    ]);

    const loadUser = async () =>
      toCherubimUser({ id: 'u1', name: 'U', permissions: [], roleIds: [] });

    const asMachine = await resolveFromApiKey(machine.plainText, store, { loadUser });
    assert.equal(asMachine?.id, 'apikey:m1');

    const asPat = await resolveFromApiKey(pat.plainText, store, { loadUser });
    assert.equal(asPat?.id, 'u1');
  });
});

function memoryStore(rows: ApiKeyRecord[]): ApiKeyStore {
  const map = new Map(rows.map((row) => [row.tokenHash, row]));
  return {
    async findByTokenHash(hash) {
      return map.get(hash) ?? null;
    },
  };
}
