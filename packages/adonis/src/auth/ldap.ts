import {
  mapGroupsToRoleIds,
  parseLdapUsername,
  type AuthLoginMode,
  type ExternalIdentity,
} from '@shamar/cherubim';

export interface LdapDomainConfig {
  /** Stable key, e.g. corp. */
  id: string;
  /** Human label for logs / UI. */
  label?: string;
  /** LDAP(S) URL. */
  url: string;
  /** Optional service-account bind for search. */
  bindDn?: string;
  bindPassword?: string;
  searchBase: string;
  /** Filter with {{username}} placeholder. */
  searchFilter: string;
  emailAttribute?: string;
  nameAttribute?: string;
  /** Default memberOf. */
  groupsAttribute?: string;
  groupRoleMap?: Record<string, string>;
  /** Prefer this domain when login uses an email domain suffix. */
  emailDomains?: string[];
  /** Prefer this domain for NetBIOS-prefixed logins. */
  netbios?: string;
  tls?: { rejectUnauthorized?: boolean };
  /** Operation timeout in milliseconds (ldapts `timeout`). Default 10_000. */
  timeoutMs?: number;
  /** TCP connect timeout in milliseconds (ldapts `connectTimeout`). Defaults to `timeoutMs`. */
  connectTimeoutMs?: number;
}

export interface LdapAuthSettings {
  domains: LdapDomainConfig[];
  /**
   * How to link a successful LDAP bind to a local user:
   * - `existing` (default) — only log in if a local row already has the sync `externalId`
   * - `create` — upsert a local user when missing (auto-provision)
   */
  provisioning?: LdapProvisioningMode;
}

/** Local user must pre-exist (`existing`) or may be auto-created (`create`). */
export type LdapProvisioningMode = 'existing' | 'create';

/** Pluggable directory client — production uses ldapts; tests inject a mock. */
export interface LdapDirectoryClient {
  authenticate(
    username: string,
    password: string,
    domain: LdapDomainConfig,
  ): Promise<ExternalIdentity | null>;
}

export type LocalCredentialVerifier<TUser> = (
  username: string,
  password: string,
) => Promise<TUser | null>;

export type LdapUserLinker<TUser> = (identity: ExternalIdentity) => Promise<TUser | null>;

export type PasswordLoginSuccess<TUser> = {
  ok: true;
  user: TUser;
  method: 'ldap' | 'local';
};

export type PasswordLoginFailure = {
  ok: false;
  message: string;
  /** Set when directory contact timed out. */
  code?: 'ldap_timeout';
};

export type PasswordLoginResult<TUser> = PasswordLoginSuccess<TUser> | PasswordLoginFailure;

export const LDAP_TIMEOUT_MESSAGE = 'Directory server timed out. Please try again.';

/** Thrown / rethrown when ldapts (or the network) times out contacting a domain. */
export class LdapTimeoutError extends Error {
  readonly domainId: string;

  constructor(domainId: string, cause?: unknown) {
    const detail =
      cause instanceof Error && cause.message.trim()
        ? cause.message.trim()
        : 'operation timed out';
    super(`LDAP domain "${domainId}" timed out: ${detail}`);
    this.name = 'LdapTimeoutError';
    this.domainId = domainId;
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export function isLdapTimeoutError(error: unknown): boolean {
  if (error instanceof LdapTimeoutError) return true;
  if (!error || typeof error !== 'object') return false;

  const err = error as { name?: string; code?: string; message?: string };
  const code = String(err.code ?? '').toUpperCase();
  if (code === 'ETIMEDOUT' || code === 'TIMEOUT' || code === 'ECONNABORTED') {
    return true;
  }

  const name = String(err.name ?? '');
  if (/timeout/i.test(name)) return true;

  const message = String(err.message ?? '').toLowerCase();
  return (
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('connect timeout')
  );
}

export type AuthenticateLdapResult = {
  identity: ExternalIdentity | null;
  /** True when at least one domain attempt failed due to a timeout. */
  timedOut: boolean;
};

export function resolveLdapProvisioning(
  mode: LdapProvisioningMode | undefined,
): LdapProvisioningMode {
  return mode === 'create' ? 'create' : 'existing';
}

export function resolveAuthLoginMode(
  mode: AuthLoginMode | undefined,
  domains: LdapDomainConfig[] | undefined,
): AuthLoginMode {
  if (mode === 'local' || mode === 'ldap' || mode === 'both') return mode;
  return domains?.length ? 'both' : 'local';
}

/**
 * Order domains: hinted matches first, then remaining config order.
 */
export function orderLdapDomains(
  usernameInput: string,
  domains: LdapDomainConfig[],
): LdapDomainConfig[] {
  const parsed = parseLdapUsername(usernameInput);
  const preferred: LdapDomainConfig[] = [];
  const rest: LdapDomainConfig[] = [];

  for (const domain of domains) {
    let match = false;
    if (parsed.netbios && domain.netbios) {
      match = domain.netbios.toUpperCase() === parsed.netbios.toUpperCase();
    }
    if (!match && parsed.emailDomain && domain.emailDomains?.length) {
      const needle = parsed.emailDomain.toLowerCase();
      match = domain.emailDomains.some((d) => d.toLowerCase() === needle);
    }
    if (match) preferred.push(domain);
    else rest.push(domain);
  }

  return [...preferred, ...rest];
}

export function searchUsernameForDomain(
  usernameInput: string,
  _domain: LdapDomainConfig,
): string {
  const parsed = parseLdapUsername(usernameInput);
  return parsed.username || usernameInput.trim();
}

/**
 * Try domains in order until one authenticates.
 * Returns `{ identity: null }` when none succeed (caller decides local fallback).
 * Sets `timedOut` when any domain attempt hit a connect/operation timeout.
 */
export async function authenticateLdap(
  usernameInput: string,
  password: string,
  domains: LdapDomainConfig[],
  client: LdapDirectoryClient,
): Promise<AuthenticateLdapResult> {
  if (!password || !usernameInput.trim() || domains.length === 0) {
    return { identity: null, timedOut: false };
  }

  const ordered = orderLdapDomains(usernameInput, domains);
  let timedOut = false;

  for (const domain of ordered) {
    const username = searchUsernameForDomain(usernameInput, domain);
    try {
      const identity = await client.authenticate(username, password, domain);
      if (identity) return { identity, timedOut };
    } catch (error) {
      if (isLdapTimeoutError(error)) {
        timedOut = true;
        console.warn(
          `[shamar/ldap] domain "${domain.id}" timed out:`,
          error instanceof Error ? error.message : error,
        );
        continue;
      }
      // Unreachable / misconfigured domain — try the next one.
      console.warn(
        `[shamar/ldap] domain "${domain.id}" failed:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
  return { identity: null, timedOut };
}

/**
 * Orchestrate local / LDAP / both login modes.
 *
 * After a successful directory bind, {@link linkFromLdap} must resolve a local
 * user (matched by sync UID / externalId). When `provisioning` is `existing`
 * and no local row exists, LDAP login fails (or falls through to local when
 * `loginMode` is `both`).
 */
export async function resolvePasswordLogin<TUser>(options: {
  username: string;
  password: string;
  loginMode?: AuthLoginMode;
  domains?: LdapDomainConfig[];
  /** Default `existing` — AD users must already exist locally with a sync UID. */
  provisioning?: LdapProvisioningMode;
  client: LdapDirectoryClient;
  verifyLocal: LocalCredentialVerifier<TUser>;
  /**
   * Link LDAP identity → local user.
   * Return `null` when no local user exists (and auto-create is not desired).
   */
  linkFromLdap: LdapUserLinker<TUser>;
}): Promise<PasswordLoginResult<TUser>> {
  const mode = resolveAuthLoginMode(options.loginMode, options.domains);
  const domains = options.domains ?? [];
  const provisioning = resolveLdapProvisioning(options.provisioning);

  if (mode === 'local') {
    const user = await options.verifyLocal(options.username, options.password);
    if (!user) return { ok: false, message: 'Invalid user credentials' };
    return { ok: true, user, method: 'local' };
  }

  if (domains.length === 0) {
    return {
      ok: false,
      message: 'LDAP login is enabled but no domains are configured',
    };
  }

  const { identity, timedOut } = await authenticateLdap(
    options.username,
    options.password,
    domains,
    options.client,
  );

  if (identity) {
    const user = await options.linkFromLdap(identity);
    if (user) {
      return { ok: true, user, method: 'ldap' };
    }
    if (provisioning === 'existing') {
      // Bound in LDAP but no local sync row — do not invent a user.
      if (mode === 'ldap') {
        return {
          ok: false,
          message: 'No local account is linked to this directory user',
        };
      }
      // both: fall through to local password check
    } else {
      // create mode with null link is a host bug
      return {
        ok: false,
        message: 'Unable to provision local account for directory user',
      };
    }
  }

  if (mode === 'ldap') {
    if (timedOut) {
      return { ok: false, message: LDAP_TIMEOUT_MESSAGE, code: 'ldap_timeout' };
    }
    return { ok: false, message: 'Invalid user credentials' };
  }

  // both → local fallback (also when LDAP user is not linked locally)
  const user = await options.verifyLocal(options.username, options.password);
  if (user) return { ok: true, user, method: 'local' };

  if (timedOut) {
    return { ok: false, message: LDAP_TIMEOUT_MESSAGE, code: 'ldap_timeout' };
  }
  return { ok: false, message: 'Invalid user credentials' };
}

/** Apply domain groupRoleMap to an identity's groups. */
export function roleIdsFromLdapIdentity(identity: ExternalIdentity, domain: LdapDomainConfig): string[] {
  return mapGroupsToRoleIds(identity.groups, domain.groupRoleMap ?? {});
}

function attrValue(entry: Record<string, unknown>, name: string): string | undefined {
  const raw = entry[name] ?? entry[name.toLowerCase()];
  if (raw == null) return undefined;
  if (Array.isArray(raw)) {
    const first = raw[0];
    return first != null ? String(first) : undefined;
  }
  return String(raw);
}

function attrValues(entry: Record<string, unknown>, name: string): string[] {
  const raw = entry[name] ?? entry[name.toLowerCase()];
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((item) => item != null && String(item).trim() !== '')
      .map((item) => String(item));
  }
  const value = String(raw).trim();
  return value ? [value] : [];
}

function buildSearchFilter(template: string, username: string): string {
  const escaped = username.replace(/[\\*()]/g, (ch) => `\\${ch}`);
  return template.replaceAll('{{username}}', escaped);
}

/**
 * Default ldapts-backed client. Requires the optional `ldapts` peer dependency.
 */
export function createLdaptsDirectoryClient(): LdapDirectoryClient {
  return {
    async authenticate(username, password, domain) {
      let Client: typeof import('ldapts').Client;
      try {
        ({ Client } = await import('ldapts'));
      } catch {
        throw new Error(
          'LDAP login requires the optional peer dependency "ldapts". Install it in your app.',
        );
      }

      const timeout = domain.timeoutMs ?? 10_000;
      const client = new Client({
        url: domain.url,
        timeout,
        connectTimeout: domain.connectTimeoutMs ?? timeout,
        tlsOptions: domain.tls,
      });

      try {
        if (domain.bindDn) {
          await client.bind(domain.bindDn, domain.bindPassword ?? '');
        }

        const filter = buildSearchFilter(
          domain.searchFilter || '(uid={{username}})',
          username,
        );
        const emailAttr = domain.emailAttribute ?? 'mail';
        const nameAttr = domain.nameAttribute ?? 'cn';
        const groupsAttr = domain.groupsAttribute ?? 'memberOf';

        const { searchEntries } = await client.search(domain.searchBase, {
          scope: 'sub',
          filter,
          attributes: [
            'dn',
            'distinguishedName',
            emailAttr,
            nameAttr,
            groupsAttr,
            'uid',
            'sAMAccountName',
          ],
          sizeLimit: 1,
        });

        const entry = searchEntries[0] as
          | (Record<string, unknown> & { dn?: string })
          | undefined;
        if (!entry) return null;

        const dn =
          (typeof entry.dn === 'string' && entry.dn) ||
          attrValue(entry, 'distinguishedName') ||
          attrValue(entry, 'dn');
        if (!dn) return null;

        // Re-bind as the user to verify credentials.
        await client.bind(dn, password);

        const groups = attrValues(entry, groupsAttr);
        return {
          provider: 'ldap' as const,
          domainId: domain.id,
          subject: dn,
          username,
          email: attrValue(entry, emailAttr),
          name: attrValue(entry, nameAttr),
          groups,
          raw: { ...entry },
        };
      } catch (error) {
        if (isLdapTimeoutError(error)) {
          throw new LdapTimeoutError(domain.id, error);
        }
        return null;
      } finally {
        try {
          await client.unbind();
        } catch {
          /* ignore */
        }
      }
    },
  };
}
