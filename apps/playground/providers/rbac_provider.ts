import type { ApplicationService } from '@adonisjs/core/types'
import { hashApiKey } from '@shamar/cherubim'
import ApiKey from '#models/api_key'
import Permission from '#models/permission'
import Role from '#models/role'
import User from '#models/user'
import { syncPermissionCatalog } from '#auth/sync_permissions'

/** Stable playground demo key for curl / mobile testing (not for production). */
export const PLAYGROUND_DEMO_API_KEY =
  'shm_demo_playground_api_key_do_not_use_in_production_000001'

/**
 * Syncs the permission catalog from Shamar resources and seeds default roles.
 */
export default class RbacProvider {
  constructor(protected app: ApplicationService) {}

  async ready() {
    const runtime = await this.app.container.make('shamar.runtime')

    await syncPermissionCatalog(runtime.registry)

    const allPermissions = await Permission.find({}).lean()
    const permissionIds = allPermissions.map((entry) => String(entry._id))
    const allNames = allPermissions.map((entry) => entry.name)

    const editorNames = allNames.filter((name) => {
      if (name === '*') return false
      const resource = name.split(':')[0]
      return !['users', 'roles', 'permissions'].includes(resource)
    })

    const viewerNames = allNames.filter((name) => {
      if (name === '*') return false
      return name.endsWith(':viewAny') || name.endsWith(':view')
    })

    const byName = (names: string[]) =>
      allPermissions.filter((entry) => names.includes(entry.name)).map((entry) => String(entry._id))

    const roleDefs = [
      {
        slug: 'admin',
        name: 'Administrator',
        description: 'Full access',
        permissionIds,
      },
      {
        slug: 'editor',
        name: 'Editor',
        description: 'Manage app resources (not users/roles/permissions)',
        permissionIds: byName(editorNames),
      },
      {
        slug: 'viewer',
        name: 'Viewer',
        description: 'Read-only on app resources',
        permissionIds: byName(viewerNames),
      },
    ]

    for (const def of roleDefs) {
      await Role.findOneAndUpdate(
        { slug: def.slug },
        {
          $set: {
            name: def.name,
            slug: def.slug,
            description: def.description,
            permissionIds: def.permissionIds,
            active: true,
          },
        },
        { upsert: true, new: true },
      )
    }

    const adminRole = await Role.findOne({ slug: 'admin' })
    const viewerRole = await Role.findOne({ slug: 'viewer' })

    if (adminRole) {
      await User.updateMany(
        { email: 'admin@example.com' },
        {
          $set: { roleIds: [String(adminRole._id)] },
          $unset: { roles: '', roleId: '' },
        },
      )
    }

    if (viewerRole) {
      await User.updateMany(
        { email: 'viewer@example.com' },
        {
          $set: { roleIds: [String(viewerRole._id)] },
          $unset: { roles: '', roleId: '' },
        },
      )
    }

    if (adminRole) {
      await User.updateMany(
        {
          roles: { $in: ['admin'] },
          $or: [{ roleIds: { $exists: false } }, { roleIds: { $size: 0 } }],
        },
        {
          $set: { roleIds: [String(adminRole._id)] },
          $unset: { roles: '', roleId: '' },
        },
      )
    }
    if (viewerRole) {
      await User.updateMany(
        {
          roles: { $in: ['viewer'] },
          $or: [{ roleIds: { $exists: false } }, { roleIds: { $size: 0 } }],
        },
        {
          $set: { roleIds: [String(viewerRole._id)] },
          $unset: { roles: '', roleId: '' },
        },
      )
    }

    await User.collection.updateMany(
      {
        roleId: { $exists: true, $nin: [null, ''] },
        $or: [{ roleIds: { $exists: false } }, { roleIds: { $size: 0 } }],
      },
      [
        {
          $set: {
            roleIds: {
              $cond: [
                { $and: [{ $ne: ['$roleId', null] }, { $ne: ['$roleId', ''] }] },
                ['$roleId'],
                [],
              ],
            },
          },
        },
        { $unset: 'roleId' },
      ],
    )

    const adminUser = await User.findOne({ email: 'admin@example.com' })
    const machineHash = hashApiKey(PLAYGROUND_DEMO_API_KEY)
    await ApiKey.findOneAndUpdate(
      { tokenHash: machineHash },
      {
        $set: {
          name: 'Playground mobile demo',
          description: 'Demo machine key for playground API access (not for production).',
          kind: 'machine',
          tokenHash: machineHash,
          tokenPrefix: PLAYGROUND_DEMO_API_KEY.slice(0, 12),
          abilities: ['*'],
          userId: null,
          createdByUserId: adminUser ? String(adminUser._id) : null,
          revokedAt: null,
          expiresAt: null,
        },
      },
      { upsert: true, new: true },
    )
  }
}
