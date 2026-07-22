import type { ShamarHttpContext } from '../context.js';
import type { AuthCapableContext } from '../context.js';
import {
  Authorizer,
  ForbiddenError,
  PolicyRegistry,
  UnauthorizedError,
  extractAuthCredentials,
  extractBearerToken,
  extractMachineApiKey,
  intersectPermissions,
  isMachineApiKeyPrincipal,
  resolveUserPermissions,
  toCherubimUser,
  type AuthorizationContext,
  type CherubimUser,
  type ResourceAction,
} from '@shamar/cherubim';
import type { ResourceMeta, ResourceRegistry } from '@shamar/core';
import type { ShamarConfig } from '../config.js';

export { ForbiddenError, UnauthorizedError };

/** Whether panel routes should require an authenticated user. */
export function authRequired(config: ShamarConfig): boolean {
  if (config.auth?.required === false) return false;
  if (config.auth?.required === true) return true;
  return Boolean(config.auth?.guard || config.auth?.resolveUser || config.auth?.apiKeys);
}

export function createAuthorizer(config: ShamarConfig, policies: PolicyRegistry): Authorizer {
  return new Authorizer(
    {
      superUser: config.auth?.superUser,
      treatAdminsAsSuper: config.auth?.strictPermissions !== false,
    },
    undefined,
    policies,
  );
}

function requestHeaders(ctx: ShamarHttpContext): {
  get(name: string): string | undefined;
} {
  const request = ctx.request as unknown as {
    header?(name: string): string | undefined;
    headers?: (() => Record<string, string | string[] | undefined>) | Record<string, string | string[] | undefined>;
  };

  return {
    get(name: string) {
      if (typeof request.header === 'function') {
        return request.header(name) ?? undefined;
      }
      const headers =
        typeof request.headers === 'function' ? request.headers() : (request.headers ?? {});
      const raw = headers[name] ?? headers[name.toLowerCase()];
      if (Array.isArray(raw)) return raw[0];
      return typeof raw === 'string' ? raw : undefined;
    },
  };
}

interface ResolvedCredentials {
  /** Machine principal from `X-Api-Key` (or sole Bearer machine key). */
  gateway: CherubimUser | null;
  /** User/PAT from Bearer when distinct from gateway. */
  bearer: CherubimUser | null;
  /** Bearer header was sent but did not resolve to a valid PAT/machine key. */
  bearerInvalid: boolean;
}

async function resolveHeaderCredentials(
  ctx: ShamarHttpContext,
  config: ShamarConfig,
): Promise<ResolvedCredentials> {
  const resolver = config.auth?.apiKeys?.resolve;
  if (!resolver) return { gateway: null, bearer: null, bearerInvalid: false };

  const headers = requestHeaders(ctx);
  const { apiKey, bearer } = extractAuthCredentials(headers);

  let gateway: CherubimUser | null = null;
  let bearerUser: CherubimUser | null = null;
  let bearerInvalid = false;

  if (apiKey) {
    const principal = await resolver(apiKey, ctx);
    if (principal && isMachineApiKeyPrincipal(principal)) {
      gateway = principal;
    } else if (principal && !bearer) {
      // PAT mistakenly in X-Api-Key with no Bearer — still accept as identity.
      bearerUser = principal;
    }
  }

  if (bearer) {
    const principal = await resolver(bearer, ctx);
    if (principal) {
      if (isMachineApiKeyPrincipal(principal) && !gateway) {
        // Single-credential: machine key only in Authorization.
        gateway = principal;
      } else if (!isMachineApiKeyPrincipal(principal)) {
        bearerUser = principal;
      }
      // Duplicate machine key in Bearer while X-Api-Key already set — ignore Bearer.
    } else {
      bearerInvalid = true;
    }
  }

  return { gateway, bearer: bearerUser, bearerInvalid };
}

async function resolveSessionUser(
  ctx: ShamarHttpContext,
  config: ShamarConfig,
): Promise<CherubimUser | null> {
  if (config.auth?.resolveUser) {
    const user = await config.auth.resolveUser(ctx);
    return user ?? null;
  }

  const guard = config.auth?.guard ?? 'web';

  try {
    const auth = (ctx as AuthCapableContext).auth?.use(guard);
    if (!auth || !(await auth.check())) return null;

    const raw = auth.user as Record<string, unknown> | undefined;
    if (!raw) return null;

    const id = raw.id ?? raw._id;
    if (id == null || id === '') return null;

    const name =
      (typeof raw.fullName === 'string' && raw.fullName.trim()) ||
      (typeof raw.name === 'string' && raw.name.trim()) ||
      (typeof raw.email === 'string' ? raw.email.split('@')[0] : '') ||
      String(id);

    return toCherubimUser({
      id: String(id),
      name,
      email: typeof raw.email === 'string' ? raw.email : undefined,
      permissions: Array.isArray(raw.permissions) ? (raw.permissions as string[]) : undefined,
      roleIds: Array.isArray(raw.roleIds)
        ? (raw.roleIds as string[])
        : raw.roleId != null && raw.roleId !== ''
          ? [String(raw.roleId)]
          : Array.isArray(raw.roles)
            ? (raw.roles as string[])
            : undefined,
    });
  } catch {
    return null;
  }
}

/** Map header credentials / session to a Cherubim principal. */
export async function resolveShamarUser(
  ctx: ShamarHttpContext,
  config: ShamarConfig,
): Promise<CherubimUser | null> {
  const { gateway, bearer } = await resolveHeaderCredentials(ctx, config);
  if (bearer) return bearer;
  if (gateway) return gateway;
  return resolveSessionUser(ctx, config);
}

export async function buildAuthContext(
  ctx: ShamarHttpContext,
  config: ShamarConfig,
  panelId?: string,
): Promise<AuthorizationContext> {
  const { gateway, bearer, bearerInvalid } = await resolveHeaderCredentials(ctx, config);

  // Invalid Bearer must not fall through to the gateway principal.
  if (bearerInvalid) {
    return {
      user: null,
      panelId,
      gatewayApiKeyId: gateway?.apiKeyId,
    };
  }

  const sessionUser = bearer || gateway ? null : await resolveSessionUser(ctx, config);

  let user: CherubimUser | null = bearer ?? sessionUser ?? gateway;
  let authMethod: AuthorizationContext['authMethod'];

  if (bearer) {
    authMethod = 'pat';
  } else if (sessionUser) {
    authMethod = 'session';
  } else if (gateway) {
    authMethod = 'api_key';
  }

  const apiKeyId = user?.apiKeyId;
  const gatewayApiKeyId = gateway?.apiKeyId;

  // Session + PAT: merge role permissions. Machine keys already carry abilities.
  if (user && config.auth?.roleResolver && !isMachineApiKeyPrincipal(user)) {
    user = await resolveUserPermissions(user, config.auth.roleResolver);
  }

  // PAT: optional ability narrowing after role merge (empty = full user access).
  if (authMethod === 'pat') {
    user = {
      ...user!,
      permissions: intersectPermissions(user!.permissions ?? [], user!.apiKeyAbilities),
    };
  }

  // Dual credentials: optionally cap the user by the gateway machine key’s abilities.
  const intersectGateway = config.auth?.apiKeys?.intersectGatewayAbilities !== false;
  if (
    intersectGateway &&
    gateway &&
    user &&
    !isMachineApiKeyPrincipal(user) &&
    Array.isArray(gateway.permissions) &&
    gateway.permissions.length > 0
  ) {
    user = {
      ...user,
      permissions: intersectPermissions(user.permissions ?? [], gateway.permissions),
    };
  }

  return { user, panelId, authMethod, apiKeyId, gatewayApiKeyId };
}

/**
 * API-prefix requests may require a valid machine gateway key when the
 * `requireApiKey` middleware is applied to the route (or `auth.apiKeys.protectApi`).
 *
 * @deprecated Prefer {@link RequireApiKeyMiddleware} / `protectApi`. Kept for
 * callers that still pass an explicit API-route flag.
 */
export function missingRequiredMachineKey(
  authCtx: AuthorizationContext,
  config: ShamarConfig,
  isApiRoute: boolean,
): boolean {
  if (!isApiRoute) return false;
  if (!config.auth?.apiKeys?.protectApi) return false;
  return !authCtx.gatewayApiKeyId;
}

export interface ResourcePolicyFlags {
  create: boolean;
  update: boolean;
  delete: boolean;
}

export function resourcePolicyFlags(
  authorizer: Authorizer,
  authCtx: AuthorizationContext,
  registry: ResourceRegistry,
  meta: ResourceMeta,
  record?: Record<string, unknown> | null,
): ResourcePolicyFlags {
  const ResourceClass = registry.resourceClass(meta.slug);
  if (!ResourceClass || !authCtx.user) {
    return { create: true, update: true, delete: true };
  }

  return {
    create: authorizer.canResource(authCtx, ResourceClass, 'create'),
    update: authorizer.canResource(authCtx, ResourceClass, 'update', record ?? undefined),
    delete: authorizer.canResource(authCtx, ResourceClass, 'delete', record ?? undefined),
  };
}

export function canViewResource(
  authorizer: Authorizer,
  authCtx: AuthorizationContext,
  registry: ResourceRegistry,
  slug: string,
): boolean {
  const ResourceClass = registry.resourceClass(slug);
  if (!ResourceClass) return true;
  if (!authCtx.user) return false;
  return authorizer.canResource(authCtx, ResourceClass, 'viewAny');
}

export function respondUnauthorized(
  ctx: ShamarHttpContext,
  config: ShamarConfig,
  asJson: boolean,
  message = 'Authentication required.',
): unknown {
  if (asJson) {
    return ctx.response.status(401).json({ message });
  }

  return ctx.response.redirect(config.auth?.loginPath ?? '/login');
}

export function respondForbidden(
  ctx: ShamarHttpContext,
  message: string,
  asJson: boolean,
  fallbackPath: string,
): unknown {
  if (asJson) {
    return ctx.response.status(403).json({ message });
  }

  ctx.session.flash('error', message);
  return ctx.response.redirect(fallbackPath);
}

export function assertResourceAccess(
  authorizer: Authorizer,
  authCtx: AuthorizationContext,
  registry: ResourceRegistry,
  meta: ResourceMeta,
  action: ResourceAction,
  record?: Record<string, unknown>,
): void {
  const ResourceClass = registry.resourceClass(meta.slug);
  if (!ResourceClass) return;
  authorizer.assertResource(authCtx, ResourceClass, action, record);
}
