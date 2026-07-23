import { randomBytes } from 'node:crypto'
import {
  ldapExternalId,
  mergeExternalRoles,
  sanitizeRoleIds,
  type ExternalIdentity,
} from '@shamar/cherubim'
import {
  roleIdsFromLdapIdentity,
  type LdapDomainConfig,
  type LdapProvisioningMode,
} from '@shamar/adonis'
import User, { type UserDocument } from '#models/user'

/**
 * Link a successful LDAP bind to a local user via sync UID (`externalId`).
 *
 * - `existing` (default): require a pre-provisioned local row; return null if missing
 * - `create`: upsert when missing
 *
 * On match, refreshes name/email/roles from the directory.
 * Role ids are always sanitized so `String(null)` / empty casts never persist.
 */
export async function linkUserFromLdap(
  identity: ExternalIdentity,
  domain: LdapDomainConfig | undefined,
  provisioning: LdapProvisioningMode = 'existing',
): Promise<UserDocument | null> {
  const externalId = ldapExternalId(identity)
  const email = (
    identity.email || `${identity.username || 'user'}@${identity.domainId}.ldap`
  ).toLowerCase()
  const mappedRoles = sanitizeRoleIds(domain ? roleIdsFromLdapIdentity(identity, domain) : [])

  // Prefer sync UID; email is a secondary lookup for legacy rows.
  let user = await User.findOne({ externalId })
  if (!user && identity.email) {
    user = await User.findOne({ email: identity.email.toLowerCase() })
  }

  if (!user) {
    if (provisioning !== 'create') return null

    user = new User({
      email,
      fullName: identity.name ?? identity.username ?? email,
      password: randomBytes(32).toString('hex'),
      authProvider: 'ldap',
      externalId,
      ldapDomainId: identity.domainId,
      roleIds: mappedRoles,
    })
    await user.save()
    return user as UserDocument
  }

  user.authProvider = 'ldap'
  user.externalId = externalId
  user.ldapDomainId = identity.domainId
  if (identity.name) user.fullName = identity.name
  if (identity.email) user.email = identity.email.toLowerCase()
  // Always rewrite through sanitize/merge so legacy `"null"` entries are dropped.
  user.roleIds = mergeExternalRoles(
    Array.isArray(user.roleIds) ? [...user.roleIds] : [],
    mappedRoles,
  )
  user.markModified('roleIds')
  await user.save()
  return user as UserDocument
}
