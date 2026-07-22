import {
  generateApiKey,
  hashApiKey,
  resolveFromApiKey,
  toCherubimUser,
  type ApiKeyStore,
  type CherubimUser,
} from '@shamar/cherubim'
import ApiKey from '#models/api_key'
import User from '#models/user'

export const apiKeyStore: ApiKeyStore = {
  async findByTokenHash(hash) {
    const record = await ApiKey.findOne({ tokenHash: hash }).lean()
    if (!record) return null
    return {
      id: String(record._id),
      tokenHash: record.tokenHash,
      name: record.name,
      kind: record.kind,
      userId: record.userId ?? null,
      abilities: record.abilities ?? [],
      expiresAt: record.expiresAt ?? null,
      revokedAt: record.revokedAt ?? null,
    }
  },

  async touch(id) {
    if (!/^[a-f\d]{24}$/i.test(id)) return
    await ApiKey.findByIdAndUpdate(id, { $set: { lastUsedAt: new Date() } })
  },
}

async function loadUserForPat(userId: string): Promise<CherubimUser | null> {
  if (!/^[a-f\d]{24}$/i.test(userId)) return null
  const user = await User.findById(userId).lean()
  if (!user) return null

  const roleIds = Array.isArray(user.roleIds) ? user.roleIds.map(String).filter(Boolean) : []

  return toCherubimUser({
    id: String(user._id),
    name: user.fullName?.trim() || user.email.split('@')[0] || user.email,
    email: user.email,
    roleIds,
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
  })
}

/** Resolve PAT or machine API key from a Bearer / X-Api-Key credential. */
export async function resolvePlaygroundApiKeyUser(plainText: string): Promise<CherubimUser | null> {
  return resolveFromApiKey(plainText, apiKeyStore, { loadUser: loadUserForPat })
}

export { generateApiKey, hashApiKey }
