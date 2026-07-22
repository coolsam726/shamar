import type { Resource, ShamarUser } from '@shamar/core';

/** Authenticated principal for authorization checks. */
export type CherubimUser = ShamarUser & {
  id: string;
  permissions?: string[];
  roleIds?: string[];
  /** Set when authenticated via API key. */
  apiKeyId?: string;
  /** Raw key abilities before intersection with user permissions. */
  apiKeyAbilities?: string[];
};

/** CRUD-style actions on a Shamar resource. */
export type ResourceAction = 'viewAny' | 'view' | 'create' | 'update' | 'delete';

export type ResourceClass = typeof Resource;

export interface AuthorizationContext {
  user: CherubimUser | null;
  /** Active Shamar panel id (e.g. `admin`). */
  panelId?: string;
  /** Tenant / company scope for multi-tenancy (phase 2). */
  companyId?: string;
  /** How the principal was authenticated. */
  authMethod?: 'session' | 'api_key' | 'pat';
  /** Active API key / PAT id for the principal (`user`). */
  apiKeyId?: string;
  /**
   * Machine gateway key id from `X-Api-Key` when dual credentials are used.
   * Present even when `user` comes from a Bearer PAT or session.
   */
  gatewayApiKeyId?: string;
}

export interface AuthorizationTarget {
  resource?: ResourceClass;
  record?: Record<string, unknown>;
  meta?: { slug?: string };
}

export type AbilityHandler = (
  ctx: AuthorizationContext,
  target?: AuthorizationTarget,
) => boolean | Promise<boolean>;

export interface AuthorizerOptions {
  /** Users matching this predicate bypass all checks. */
  superUser?: (user: CherubimUser) => boolean;
  /** When true (default), users with `admin` role or `*` permission bypass checks. */
  treatAdminsAsSuper?: boolean;
}

export interface RoleDefinition {
  id: string;
  name: string;
  permissions: string[];
}

export interface RoleResolver {
  resolveRolePermissions(roleIds: string[]): Promise<string[]> | string[];
}
