import { AbilityRegistry } from './abilities.js';
import { ForbiddenError, UnauthorizedError } from './errors.js';
import type { PolicyRegistry } from './policy-registry.js';
import { PolicyRegistry as PolicyRegistryClass } from './policy-registry.js';
import { scopeList } from './policy.js';
import { authorizeResourceAction } from './resource-policy.js';
import type {
  AuthorizationContext,
  AuthorizationTarget,
  AuthorizerOptions,
  CherubimUser,
  ResourceAction,
  ResourceClass,
} from './types.js';
import { isAdmin } from '@shamar/core';

export class Authorizer {
  readonly abilities: AbilityRegistry;
  readonly policies: PolicyRegistry;
  private readonly options: AuthorizerOptions;

  constructor(
    options: AuthorizerOptions = {},
    abilities = new AbilityRegistry(),
    policies?: PolicyRegistry,
  ) {
    this.abilities = abilities;
    this.options = options;
    this.policies = policies ?? new PolicyRegistryClass();
  }

  isAuthenticated(ctx: AuthorizationContext): boolean {
    return ctx.user != null && ctx.user.id != null && ctx.user.id !== '';
  }

  async can(
    ctx: AuthorizationContext,
    ability: string,
    target?: AuthorizationTarget,
  ): Promise<boolean> {
    if (!this.isAuthenticated(ctx)) return false;
    const user = ctx.user!;

    if (this.isSuperUser(user)) return true;

    const { can } = await import('@shamar/core');
    if (can(user, ability)) return true;

    return this.abilities.check(ctx, ability, target);
  }

  canResource(
    ctx: AuthorizationContext,
    ResourceClass: ResourceClass,
    action: ResourceAction,
    record?: Record<string, unknown>,
  ): boolean {
    if (!this.isAuthenticated(ctx)) return false;
    const user = ctx.user!;

    // Superusers get `*` for permission checks, but Resource.can* still wins
    // (e.g. readonly PermissionResource with canCreate/canEdit/canDelete → false).
    const principal = this.isSuperUser(user)
      ? {
          ...user,
          permissions: [...new Set([...(user.permissions ?? []), '*'])],
        }
      : user;

    return authorizeResourceAction(
      ResourceClass,
      action,
      principal,
      record,
      this.policies,
    );
  }

  assertAuthenticated(ctx: AuthorizationContext): asserts ctx is AuthorizationContext & {
    user: CherubimUser;
  } {
    if (!this.isAuthenticated(ctx)) {
      throw new UnauthorizedError();
    }
  }

  async assert(
    ctx: AuthorizationContext,
    ability: string,
    target?: AuthorizationTarget,
    message?: string,
  ): Promise<void> {
    this.assertAuthenticated(ctx);
    const allowed = await this.can(ctx, ability, target);
    if (!allowed) {
      throw new ForbiddenError(message);
    }
  }

  assertResource(
    ctx: AuthorizationContext,
    ResourceClass: ResourceClass,
    action: ResourceAction,
    record?: Record<string, unknown>,
    message?: string,
  ): void {
    this.assertAuthenticated(ctx);
    if (!this.canResource(ctx, ResourceClass, action, record)) {
      throw new ForbiddenError(message);
    }
  }

  filterViewableResources(
    ctx: AuthorizationContext,
    resources: ResourceClass[],
  ): ResourceClass[] {
    if (!this.isAuthenticated(ctx)) return [];
    return resources.filter((ResourceClass) =>
      this.canResource(ctx, ResourceClass, 'viewAny'),
    );
  }

  /** List scope for a resource (policy `scopeList` + tenancy). */
  listScope(
    ctx: AuthorizationContext,
    ResourceClass: ResourceClass,
  ): Record<string, unknown> | undefined {
    if (!ctx.user) return undefined;
    const slug = ResourceClass.slug;
    const policy = this.policies.resolve(slug, ResourceClass) ?? ResourceClass.policy;
    const queryScope = scopeList(policy, ctx.user, slug);
    const equals = queryScope?.equals;
    if (!equals || Object.keys(equals).length === 0) return undefined;
    return { ...equals };
  }

  private isSuperUser(user: CherubimUser): boolean {
    if (this.options.superUser?.(user)) return true;
    if (this.options.treatAdminsAsSuper !== false && isAdmin(user)) return true;
    return false;
  }
}
