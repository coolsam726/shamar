import { AbilityRegistry } from './abilities.js';
export {
  extractApiKey,
  extractAuthCredentials,
  extractBearerToken,
  extractMachineApiKey,
  generateApiKey,
  hashApiKey,
  intersectPermissions,
  isMachineApiKeyPrincipal,
  resolveApiKeyKind,
  resolveFromApiKey,
  resolvePrincipalFromApiKey,
  resolveUserFromApiKey,
} from './api-keys.js';
export type {
  ApiKeyKind,
  ApiKeyRecord,
  ApiKeyStore,
  AuthCredentials,
  GeneratedApiKey,
  HeaderBag,
  LoadUserForApiKey,
} from './api-keys.js';
export { BasePolicy, actionPermission, instancePolicy } from './base-policy.js';
export { Authorizer } from './authorizer.js';
export { ForbiddenError, UnauthorizedError } from './errors.js';
export {
  can,
  canAny,
  covers,
  hasExplicitPermissions,
  isAdmin,
  matchesPermission,
  normalizeCustomPermissions,
  permissionKey,
  resourcePermissionKey,
  userHasPermission,
} from './permissions.js';
export {
  Policy,
  assertPolicy,
  checkPolicy,
  ownedBy,
  resolvePolicy,
  scopeList,
  toPolicyAbility,
} from './policy.js';
export { PolicyRegistry } from './policy-registry.js';
export {
  authorizePolicyAction,
  authorizeResourceAction,
} from './resource-policy.js';
export { buildListScope } from './scope.js';
export { resolveUserPermissions, toCherubimUser } from './user.js';
export type {
  AbilityHandler,
  AuthorizationContext,
  AuthorizationTarget,
  AuthorizerOptions,
  CherubimUser,
  ResourceAction,
  ResourceClass,
  RoleDefinition,
  RoleResolver,
} from './types.js';
export type { PolicyAbility } from './policy.js';
