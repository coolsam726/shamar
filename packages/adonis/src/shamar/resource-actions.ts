import type { ActionConfig, ResourceMeta } from '@shamar/core'
import type { ResourcePolicyFlags } from './auth.js'

function actionAllowed(action: ActionConfig, policy: ResourcePolicyFlags): boolean {
  const gate = action.ability ?? action.name
  if (gate === 'create') return policy.create
  if (gate === 'edit' || gate === 'update') return policy.update
  if (gate === 'delete') return policy.delete
  if (gate === 'view' || gate === 'viewAny') return true
  // Custom actions without an ability: allow when the user can manage records.
  return policy.delete || policy.update
}

/** Filter resource actions by placement and CRUD policy flags. */
export function resourceActionsFor(
  meta: ResourceMeta,
  placement: ActionConfig['placement'],
  policy: ResourcePolicyFlags,
): ActionConfig[] {
  return (meta.actions ?? []).filter(
    (action) => action.placement === placement && actionAllowed(action, policy),
  )
}

/** Row actions visible for a specific record (e.g. revoke vs reactivate). */
export function visibleRowActions(
  meta: ResourceMeta,
  policy: ResourcePolicyFlags,
  record?: Record<string, unknown> | null,
): ActionConfig[] {
  return resourceActionsFor(meta, 'row', policy).filter((action) => {
    if (action.name === 'edit' && !policy.update) return false
    if (action.name === 'delete' && !policy.delete) return false
    if (action.name === 'revoke' && record?.revokedAt) return false
    if (action.name === 'reactivate' && !record?.revokedAt) return false
    return true
  })
}

/** Derive Active/Revoked when a resource uses `revokedAt` + a `status` column/entry. */
export function decorateRevokedStatus(records: Record<string, unknown>[]): void {
  for (const record of records) {
    if (!('revokedAt' in record)) continue
    const revokedAt = record.revokedAt
    record.status =
      revokedAt != null && String(revokedAt).trim() !== '' ? 'Revoked' : 'Active'
  }
}
