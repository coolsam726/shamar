import type { ResourceMeta } from '@shamar/core';
import type { Authorizer } from './authorizer.js';
import type { AuthorizationContext } from './types.js';
import type { ResourceClass } from './types.js';

/**
 * Build a list-query scope from policy `scopeList` and tenancy.
 */
export function buildListScope(
  ctx: AuthorizationContext,
  meta: ResourceMeta,
  authorizer?: Authorizer,
  ResourceClass?: ResourceClass,
): Record<string, unknown> | undefined {
  const scope: Record<string, unknown> = {};

  if (authorizer && ResourceClass && ctx.user) {
    const policyScope = authorizer.listScope(ctx, ResourceClass);
    if (policyScope) Object.assign(scope, policyScope);
  }

  if (meta.companyScoped && ctx.companyId) {
    scope.companyId = ctx.companyId;
  }

  return Object.keys(scope).length > 0 ? scope : undefined;
}
