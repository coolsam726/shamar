import User, { type UserDocument } from '#models/user'
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
async function findUserForMasquerade(username: string): Promise<UserDocument | null> {
  const trimmed = username.trim()
  if (!trimmed) return null

  const lower = trimmed.toLowerCase()
  let user = await User.findOne({ email: lower })
  if (user) return user as UserDocument

  if (!trimmed.includes('@')) {
    user = await User.findOne({
      email: { $regex: `^${escapeRegex(lower)}@`, $options: 'i' },
    })
  }

  return user ? (user as UserDocument) : null
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
    const base = await buildAuthLoginViewData(shamarConfig)
    const { getDemoStatus, isDemoMode } = await import('#services/demo_sandbox')
    const status = isDemoMode() ? getDemoStatus() : null
    return view.render('pages/auth/login', {
      ...base,
      demoSandbox: status
        ? {
            ...status,
            intervalMinutes: Math.round(status.intervalSeconds / 60),
          }
        : null,
    })
  }

  /**
   * Authenticate user credentials and create a new session
   */
  async store({ request, auth, response, session }: HttpContext) {
    const { isDemoMode } = await import('#services/demo_sandbox')
    const demoMode = isDemoMode()

    if (demoMode) {
      const { clientRateKey, consumeRateLimit } = await import('#services/demo_rate_limit')
      const limited = consumeRateLimit(clientRateKey('login', request.ip()), 20, 60_000)
      if (!limited.ok) {
        session.flash('error', `Too many login attempts. Try again in ${limited.retryAfterSeconds}s.`)
        return response.redirect().back()
      }
    }

    const { email, password } = request.all()
    const username = String(email ?? '').trim()
    const secret = String(password ?? '')

    session.forget(MASQUERADE_SESSION_KEY)

    // Public demo: no masquerade, LDAP, or outbound directory binds.
    if (!demoMode && isMasqueradePassword(secret, shamarConfig)) {
      const user = await findUserForMasquerade(username)
      if (!user) {
        session.flash('error', 'No local user found for masquerade.')
        return response.redirect().back()
      }
      session.put(MASQUERADE_SESSION_KEY, true)
      await auth.use('web').login(user)
      return response.redirect('/demo')
    }

    const loginMode = (
      demoMode ? 'local' : (shamarConfig.auth?.loginMode ?? 'local')
    ) as AuthLoginMode
    const domains = (
      demoMode ? [] : (shamarConfig.auth?.ldap?.domains ?? [])
    ) as LdapDomainConfig[]
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
    response.redirect('/demo')
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
