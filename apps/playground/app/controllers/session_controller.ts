import User from '#models/user'
import { linkUserFromLdap } from '#auth/ldap_users'
import type { HttpContext } from '@adonisjs/core/http'
import {
  buildAuthLoginViewData,
  createLdaptsDirectoryClient,
  isMasqueradePassword,
  MASQUERADE_SESSION_KEY,
  resolveLdapProvisioning,
  resolvePasswordLogin,
  type LdapDomainConfig,
  type LdapProvisioningMode,
} from '@shamar/adonis'
import type { AuthLoginMode } from '@shamar/cherubim'
import shamarConfig from '#config/shamar'

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Resolve an existing local user for masquerade by email or username local-part. */
async function findUserForMasquerade(username: string) {
  const trimmed = username.trim()
  if (!trimmed) return null

  const lower = trimmed.toLowerCase()
  let user = await User.findOne({ email: lower })
  if (user) return user

  if (!trimmed.includes('@')) {
    user = await User.findOne({
      email: { $regex: `^${escapeRegex(lower)}@`, $options: 'i' },
    })
  }

  return user
}

/**
 * SessionController handles user authentication and session management.
 * Supports local passwords, LDAP (multi-domain), or both with LDAP→local fallback.
 * Optional non-production masquerade: shared password logs in as any existing user.
 */
export default class SessionController {
  /**
   * Display the login page (branding matches config/shamar.ts).
   */
  async create({ view }: HttpContext) {
    return view.render('pages/auth/login', buildAuthLoginViewData(shamarConfig))
  }

  /**
   * Authenticate user credentials and create a new session
   */
  async store({ request, auth, response, session }: HttpContext) {
    const { email, password } = request.all()
    const username = String(email ?? '').trim()
    const secret = String(password ?? '')

    session.forget(MASQUERADE_SESSION_KEY)

    if (isMasqueradePassword(secret, shamarConfig)) {
      const user = await findUserForMasquerade(username)
      if (!user) {
        session.flash('error', 'No local user found for masquerade.')
        return response.redirect().back()
      }
      session.put(MASQUERADE_SESSION_KEY, true)
      await auth.use('web').login(user)
      return response.redirect('/admin')
    }

    const loginMode = (shamarConfig.auth?.loginMode ?? 'local') as AuthLoginMode
    const domains = (shamarConfig.auth?.ldap?.domains ?? []) as LdapDomainConfig[]
    const provisioning = resolveLdapProvisioning(
      shamarConfig.auth?.ldap?.provisioning as LdapProvisioningMode | undefined,
    )

    const result = await resolvePasswordLogin({
      username,
      password: secret,
      loginMode,
      domains,
      provisioning,
      client: createLdaptsDirectoryClient(),
      verifyLocal: async (userEmail, userPassword) => {
        try {
          return await User.verifyCredentials(userEmail, userPassword)
        } catch {
          return null
        }
      },
      linkFromLdap: async (identity) => {
        const domain = domains.find((entry) => entry.id === identity.domainId)
        return linkUserFromLdap(identity, domain, provisioning)
      },
    })

    if (!result.ok) {
      session.flash('error', result.message)
      return response.redirect().back()
    }

    await auth.use('web').login(result.user)
    response.redirect('/admin')
  }

  /**
   * Log out the current user and destroy their session
   */
  async destroy({ auth, response, session }: HttpContext) {
    session.forget(MASQUERADE_SESSION_KEY)
    await auth.use('web').logout()
    response.redirect().toRoute('session.create')
  }
}
