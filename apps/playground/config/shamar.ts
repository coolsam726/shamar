import { defineConfig, panel } from '@shamar/adonis'
import { toCherubimUser } from '@shamar/cherubim'
import { resolveDatabaseRolePermissions } from '#auth/role_resolver'
import { resolvePlaygroundApiKeyUser } from '#auth/api_key_store'

export default defineConfig({
  orm: 'mongoose',
  auth: {
    guard: 'web',
    loginPath: '/login',
    logoutPath: '/logout',
    required: true,
    roleResolver: {
      resolveRolePermissions: resolveDatabaseRolePermissions,
    },
    apiKeys: {
      resolve: async (plainText) => resolvePlaygroundApiKeyUser(plainText),
      // Opt-in: require X-Api-Key on /api/shamar (same as RequireApiKeyMiddleware).
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
          }
        | undefined
      if (!sessionUser) return null

      const roleIds = Array.isArray(sessionUser.roleIds)
        ? sessionUser.roleIds.map(String).filter(Boolean)
        : sessionUser.roleId
          ? [String(sessionUser.roleId)]
          : []

      return toCherubimUser({
        id: String(sessionUser.id),
        name:
          sessionUser.fullName?.trim() ||
          sessionUser.email.split('@')[0] ||
          sessionUser.email,
        email: sessionUser.email,
        roleIds,
        permissions: Array.isArray(sessionUser.permissions) ? sessionUser.permissions : [],
      })
    },
  },
  branding: {
    name: 'Shamar Playground',
    primaryColor: '#f1511b',
    accentColor: '#286291',
    googleFont: {'family': 'DM Sans', weights: [400, 500, 600, 700, 800, 900]},
  },
  panels: [
    panel('admin')
      .path('/admin')
      .branding({ 
        name: 'Admin',
        googleFont: {'family': 'Poppins', weights: [400, 500, 600, 700, 800, 900]},
       })
      .discoverResources('app/resources/admin'),
    panel('app')
      .path('/app')
      .branding({ name: 'App' })
      .discoverResources('app/resources/app'),
  ],
})
