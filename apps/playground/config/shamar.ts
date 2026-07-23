import { defineConfig, panel, type LdapDomainConfig } from '@shamar/adonis'
import { toCherubimUser, sanitizeRoleIds, type AuthLoginMode } from '@shamar/cherubim'
import { resolveDatabaseRolePermissions } from '#auth/role_resolver'
import { resolvePlaygroundApiKeyUser } from '#auth/api_key_store'

function envStr(key: string, fallback = ''): string {
  const value = process.env[key]
  return value != null && String(value).trim() !== '' ? String(value).trim() : fallback
}

function readLdapDomains(): LdapDomainConfig[] {
  const ids = envStr('LDAP_DOMAINS')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

  const domains: LdapDomainConfig[] = []
  for (const id of ids) {
    const prefix = `LDAP_${id.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_`
    const url = envStr(`${prefix}URL`)
    const searchBase = envStr(`${prefix}SEARCH_BASE`)
    if (!url || !searchBase) continue

    const emailDomainsRaw = envStr(`${prefix}EMAIL_DOMAINS`)
    const netbios = envStr(`${prefix}NETBIOS`)
    const timeoutSec = Number(envStr(`${prefix}TIMEOUT`))
    const connectTimeoutSec = Number(envStr(`${prefix}CONNECT_TIMEOUT`))
    const timeoutMs =
      Number.isFinite(timeoutSec) && timeoutSec > 0 ? Math.round(timeoutSec * 1000) : undefined
    const connectTimeoutMs =
      Number.isFinite(connectTimeoutSec) && connectTimeoutSec > 0
        ? Math.round(connectTimeoutSec * 1000)
        : undefined

    domains.push({
      id,
      label: envStr(`${prefix}LABEL`, id),
      url,
      bindDn: envStr(`${prefix}BIND_DN`) || undefined,
      bindPassword: envStr(`${prefix}BIND_PASSWORD`) || undefined,
      searchBase,
      searchFilter: envStr(`${prefix}SEARCH_FILTER`, '(uid={{username}})'),
      emailAttribute: envStr(`${prefix}EMAIL_ATTRIBUTE`) || undefined,
      nameAttribute: envStr(`${prefix}NAME_ATTRIBUTE`) || undefined,
      groupsAttribute: envStr(`${prefix}GROUPS_ATTRIBUTE`) || undefined,
      emailDomains: emailDomainsRaw
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean),
      netbios: netbios || undefined,
      timeoutMs,
      connectTimeoutMs,
    })
  }
  return domains
}

const ldapDomains = readLdapDomains()
const loginModeEnv = envStr('AUTH_LOGIN_MODE').toLowerCase()
const loginMode: AuthLoginMode =
  loginModeEnv === 'local' || loginModeEnv === 'ldap' || loginModeEnv === 'both'
    ? loginModeEnv
    : ldapDomains.length
      ? 'both'
      : 'local'

const provisioningEnv = envStr('LDAP_PROVISIONING').toLowerCase()
const ldapProvisioning = provisioningEnv === 'create' ? 'create' : 'existing'
const masqueradePassword = envStr('MASQUERADE_PASSWORD') || undefined

const loginSubtitle = envStr('AUTH_LOGIN_SUBTITLE') || undefined
const loginFooter = envStr('AUTH_LOGIN_FOOTER') || undefined
const loginUsernamePlaceholder = envStr('AUTH_LOGIN_USERNAME_PLACEHOLDER') || undefined
const loginUsernameLabel = envStr('AUTH_LOGIN_USERNAME_LABEL') || undefined

export default defineConfig({
  orm: 'mongoose',
  auth: {
    guard: 'web',
    loginPath: '/login',
    logoutPath: '/logout',
    required: true,
    loginMode,
    login: {
      ...(loginSubtitle ? { subtitle: loginSubtitle } : {}),
      ...(loginFooter ? { footer: loginFooter } : {}),
      ...(loginUsernamePlaceholder ? { usernamePlaceholder: loginUsernamePlaceholder } : {}),
      ...(loginUsernameLabel ? { usernameLabel: loginUsernameLabel } : {}),
    },
    ldap: { domains: ldapDomains, provisioning: ldapProvisioning },
    ...(masqueradePassword ? { masquerade: { password: masqueradePassword } } : {}),
    roleResolver: {
      resolveRolePermissions: resolveDatabaseRolePermissions,
    },
    apiKeys: {
      resolve: async (plainText) => resolvePlaygroundApiKeyUser(plainText),
      protectApi: true,
    },
    resolveUser: async (ctx) => {
      const guard = ctx.auth.use('web')
      if (!(await guard.check())) return null

      const sessionUser = guard.user as
        | {
            id: string
            fullName?: string | null
            email: string
            roleIds?: string[]
            roleId?: string | null
            permissions?: string[]
            authProvider?: string
            ldapDomainId?: string | null
          }
        | undefined
      if (!sessionUser) return null

      const roleIds = sanitizeRoleIds(
        Array.isArray(sessionUser.roleIds)
          ? sessionUser.roleIds
          : sessionUser.roleId
            ? [sessionUser.roleId]
            : [],
      )

      return toCherubimUser({
        id: String(sessionUser.id),
        name:
          sessionUser.fullName?.trim() ||
          sessionUser.email.split('@')[0] ||
          sessionUser.email,
        email: sessionUser.email,
        roleIds,
        permissions: Array.isArray(sessionUser.permissions) ? sessionUser.permissions : [],
        authProvider: sessionUser.authProvider,
        ldapDomainId: sessionUser.ldapDomainId ?? undefined,
      })
    },
  },
  branding: {
    name: 'Shamar Playground',
    primaryColor: '#f1511b',
    accentColor: '#286291',
    googleFont: { family: 'DM Sans', weights: [400, 500, 600, 700, 800, 900] },
  },
  rest: {
    openapi: {
      title: 'Shamar Playground API',
      version: '0.1.3',
      description: 'JSON API for playground resources and custom /api routes.',
    },
    docs: { path: '/docs' },
    discover: { prefixes: ['/api'] },
  },
  panels: [
    panel('admin')
      .path('/admin')
      .branding({
        name: 'Admin',
        googleFont: { family: 'Poppins', weights: [400, 500, 600, 700, 800, 900] },
      })
      .discoverResources('app/resources/admin'),
    panel('app')
      .path('/app')
      .branding({ name: 'App' })
      .discoverResources('app/resources/app'),
  ],
})
