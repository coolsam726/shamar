import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import ApiKeyResource from '../src/resources/api_key_resource.js'
import { ValidationException } from '@shamar/core'

describe('ApiKeyResource', () => {
  it('configures AbilitiesAssignment with name valueAttribute', () => {
    const meta = ApiKeyResource.configure()
    const abilities = meta.fields.find((field) => field.name === 'abilities')
    assert.equal(abilities?.relation?.valueAttribute, 'name')
    assert.equal(abilities?.relation?.resource, 'permissions')
    assert.equal(ApiKeyResource.canEdit({ id: '1', name: 'Admin' }), false)
    assert.ok(meta.actions.some((action) => action.name === 'revoke' && action.placement === 'row'))
    assert.ok(meta.actions.some((action) => action.name === 'revoke' && action.placement === 'bulk'))
    assert.ok(meta.actions.some((action) => action.name === 'delete' && action.placement === 'bulk'))
  })

  it('prepareCreate hashes a machine key and defaults abilities to *', async () => {
    const meta = ApiKeyResource.configure()
    const prepared = await ApiKeyResource.prepareCreate(
      {
        name: 'iOS',
        description: 'Mobile gateway key',
        kind: 'machine',
        abilities: [],
      },
      { adapter: {} as never, meta, userId: 'issuer-1' },
    )

    assert.equal(prepared.data.kind, 'machine')
    assert.equal(prepared.data.description, 'Mobile gateway key')
    assert.deepEqual(prepared.data.abilities, ['*'])
    assert.equal(prepared.data.userId, null)
    assert.equal(prepared.data.createdByUserId, 'issuer-1')
    assert.match(String(prepared.data.tokenPrefix), /^shm_/)
    assert.equal(typeof prepared.data.tokenHash, 'string')
    assert.match(String(prepared.flashPlainText), /^shm_[a-f0-9]{80}$/)
    assert.ok(!('plainText' in prepared.data))
  })

  it('prepareCreate requires a user for PATs', async () => {
    const meta = ApiKeyResource.configure()
    await assert.rejects(
      () =>
        ApiKeyResource.prepareCreate(
          { name: 'CLI', kind: 'pat', abilities: ['products:view'] },
          { adapter: {} as never, meta, userId: null },
        ),
      (error: unknown) =>
        error instanceof ValidationException && error.errors.userId != null,
    )
  })

  it('handleAction revokes and reactivates keys', async () => {
    const meta = ApiKeyResource.configure()
    const updates: Array<{ id: string; data: Record<string, unknown> }> = []
    const adapter = {
      update: async (_meta: unknown, id: string, data: Record<string, unknown>) => {
        updates.push({ id, data })
        return { id, ...data }
      },
    }

    const revoked = await ApiKeyResource.handleAction(
      'revoke',
      [{ id: 'key-1', revokedAt: null }],
      { adapter: adapter as never, meta, userId: 'admin' },
    )
    assert.equal(revoked?.message, 'API key deactivated')
    assert.equal(updates.length, 1)
    assert.ok(updates[0]?.data.revokedAt instanceof Date)

    const reactivated = await ApiKeyResource.handleAction(
      'reactivate',
      [{ id: 'key-1', revokedAt: new Date() }],
      { adapter: adapter as never, meta, userId: 'admin' },
    )
    assert.equal(reactivated?.message, 'API key reactivated')
    assert.equal(updates[1]?.data.revokedAt, null)
  })
})
