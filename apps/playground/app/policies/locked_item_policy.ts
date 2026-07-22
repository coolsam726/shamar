import { Policy } from '@shamar/cherubim'
import type { ShamarUser } from '@shamar/core'

/**
 * Record-level policy: locked items cannot be edited or deleted.
 * Permission strings still apply via the Policy base class.
 */
export class LockedItemPolicy extends Policy {
  static override edit(
    user: ShamarUser,
    record: Record<string, unknown>,
    slug = 'locked-items',
  ): boolean {
    return super.edit(user, record, slug) && !record.locked
  }

  static override delete(
    user: ShamarUser,
    record: Record<string, unknown>,
    slug = 'locked-items',
  ): boolean {
    return super.delete(user, record, slug) && !record.locked
  }
}

export default LockedItemPolicy
