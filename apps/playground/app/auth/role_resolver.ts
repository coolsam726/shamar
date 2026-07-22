import Role from '#models/role'
import Permission from '#models/permission'

/** Resolve permission names from role document ids (MongoDB). */
export async function resolveDatabaseRolePermissions(roleIds: string[]): Promise<string[]> {
  if (!roleIds.length) return []

  const roles = await Role.find({
    _id: { $in: roleIds.filter((id) => /^[a-f\d]{24}$/i.test(id)) },
    active: { $ne: false },
  }).lean()

  const permissionIdSet = new Set<string>()
  for (const role of roles) {
    for (const id of role.permissionIds ?? []) {
      if (id) permissionIdSet.add(String(id))
    }
  }

  if (permissionIdSet.size === 0) return []

  const permissions = await Permission.find({
    _id: { $in: [...permissionIdSet] },
  })
    .select('name')
    .lean()

  return permissions.map((entry) => entry.name).filter(Boolean)
}
