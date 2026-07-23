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
  /** Local vs directory-linked account (host apps). */
  authProvider?: 'local' | 'ldap' | string;
  /** LDAP domain id when `authProvider` is `ldap`. */
  ldapDomainId?: string;
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
  authMethod?: 'session' | 'api_key' | 'pat' | 'ldap';
  /** Active API key / PAT id for the principal (`user`). */
  apiKeyId?: string;
  /**
   * Machine gateway key id from `X-Api-Key` when dual credentials are used.
   * Present even when `user` comes from a Bearer PAT or session.
   */
  gatewayApiKeyId?: string;
}

/** Login mode for password / LDAP orchestration (host apps). */
export type AuthLoginMode = 'local' | 'ldap' | 'both';

/**
 * Normalized identity returned after a successful LDAP bind.
 * Host apps upsert a local user from this and issue a session.
 */
export interface ExternalIdentity {
  provider: 'ldap';
  /** Config domain id (e.g. `corp`). */
  domainId: string;
  /** Directory subject — usually the user DN. */
  subject: string;
  username?: string;
  email?: string;
  name?: string;
  groups: string[];
  raw?: Record<string, unknown>;
}

export interface IdentityLinkResult {
  user: CherubimUser;
  created: boolean;
}

/** Result of parsing `DOMAIN\user` or `user@domain` login strings. */
export interface ParsedLdapUsername {
  /** Bind/search username (local part or full when unparsed). */
  username: string;
  emailDomain?: string;
  netbios?: string;
  raw?: string;
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
