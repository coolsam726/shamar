export { defineConfig, panel, type ShamarConfig, type ShamarOrm } from './config.js';
export { default as ShamarProvider } from './provider.js';
export { ResourceController } from './controller.js';
export {
  authRequired,
  buildAuthContext,
  canAccessPanel,
  createAuthorizer,
  missingRequiredMachineKey,
  PANEL_ACCESS_DENIED_MESSAGE,
  resolveShamarUser,
  userHasAuthorization,
} from './shamar/auth.js';
export {
  authenticateLdap,
  createLdaptsDirectoryClient,
  isLdapTimeoutError,
  LDAP_TIMEOUT_MESSAGE,
  LdapTimeoutError,
  orderLdapDomains,
  resolveAuthLoginMode,
  resolveLdapProvisioning,
  resolvePasswordLogin,
  roleIdsFromLdapIdentity,
  searchUsernameForDomain,
  type AuthenticateLdapResult,
  type LdapAuthSettings,
  type LdapDirectoryClient,
  type LdapDomainConfig,
  type LdapProvisioningMode,
  type LdapUserLinker,
  type LocalCredentialVerifier,
  type PasswordLoginResult,
} from './auth/ldap.js';
export {
  isMasqueradeEnabled,
  isMasqueradePassword,
  isMasqueradeSession,
  MASQUERADE_SESSION_KEY,
  passwordsMatch,
} from './auth/masquerade.js';
export {
  createShamarRuntime,
  type ShamarRuntime,
  type PanelRuntime,
} from './runtime.js';
export { configure, stubsRoot } from './configure.js';
export { publishAuthViews, AUTH_VIEW_FILES, AUTH_VIEW_STUBS } from './publish_auth.js';
export {
  buildAuthLoginViewData,
  resolveAuthLoginCopy,
  type AuthLoginCopy,
  type AuthLoginViewConfig,
  type AuthLoginViewData,
} from './auth_login_view.js';
export {
  buildBrandingCss,
  mergeBranding,
  resolveBranding,
  resolveGoogleFont,
  type ShamarBranding,
} from './shamar/branding.js';
export { discoverResources } from './discover.js';
export { default as ApiKeyResource } from './resources/api_key_resource.js';
export { default as RequireApiKeyMiddleware, createRequireApiKeyMiddleware } from './middleware/require_api_key_middleware.js';
