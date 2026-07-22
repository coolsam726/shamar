import type { ResourceRegistry } from '@shamar/core'
import { buildPermissionCatalog } from '@shamar/core'
import Permission from '#models/permission'

/**
 * Upsert the permission catalog from registered Shamar resources (Loom-style sync).
 * Called on app boot — permissions are never created/edited via admin UI.
 */
export async function syncPermissionCatalog(registry: ResourceRegistry): Promise<void> {
  for (const entry of buildPermissionCatalog(registry)) {
    await Permission.findOneAndUpdate(
      { name: entry.name },
      {
        $set: {
          name: entry.name,
          resource: entry.resource,
          ability: entry.ability,
          label: entry.label,
        },
      },
      { upsert: true, new: true },
    )
  }
}
