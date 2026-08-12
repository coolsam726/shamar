import { defineConfig, panel, type LdapDomainConfig } from '@shamar/adonis'
import { createMongooseMediaLibraryAdapter } from '@shamar/mongoose'
import { toCherubimUser, sanitizeRoleIds, type AuthLoginMode } from '@shamar/cherubim'
import { resolveDatabaseRolePermissions } from '#auth/role_resolver'
import { resolvePlaygroundApiKeyUser } from '#auth/api_key_store'
import { resolvePlaygroundBrandingOverrides } from '#branding/resolve_overrides'
import MediaFolder from '#models/media_folder'
import MediaFile from '#models/media_file'

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
            companyId?: string | null
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
        companyId: sessionUser.companyId ? String(sessionUser.companyId) : undefined,
      })
    },
  },
  branding: {
    name: 'Shamar Playground',
    // Full lockup for the login page (mark + wordmark).
    logo: '/branding/shamar-banner.svg',
    logoDark: '/branding/shamar-banner-dark.svg',
    logoHeight: 48,
    brandDisplay: 'logo',
    primaryColor: '#f1511b',
    accentColor: '#286291',
    googleFont: { family: 'Poppins', weights: [400, 500, 600, 700, 800, 900] },
  },
  resolveBrandingOverrides: resolvePlaygroundBrandingOverrides,
  media: {
    enabled: true,
    disk: 'shamar',
    root: 'storage/media',
    publicPath: '/media',
    label: 'Files',
    navigationGroup: 'System',
    navigationSort: 50,
    navigationIcon: 'folder',
    adapter: () =>
      createMongooseMediaLibraryAdapter({
        Folder: MediaFolder as never,
        File: MediaFile as never,
      }),
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
        name: 'SHAMAR',
        // Icon mark in the sidebar; brand name rendered beside it.
        logo: '/branding/shamar-logo.svg',
        logoDark: '/branding/shamar-logo-dark.svg',
        // Panel theme colors override global branding for this panel.
        primaryColor: '#F1511B',
        accentColor: '#286291',
        logoHeight: 32,
      })
      // Logo + name | logo only | name only.
      // Settings → Branding can override; leave Brand mark as “Use panel default” there.
      .brandDisplay('both')
      .contentMaxWidth('screen-2xl')
      .defaultPerPage(10)
      .discoverResources('app/resources/admin')
      .discoverPages('app/pages/admin'),
    panel('app')
      .path('/app')
      .branding({
        name: 'SHAMAR APP',
        logo: '/branding/shamar-logo.svg',
        logoDark: '/branding/shamar-logo-dark.svg',
        logoHeight: 32,
      })
      .brandDisplay('both')
      .discoverResources('app/resources/app'),
  ],
})
