import { createHash, randomBytes } from 'node:crypto';
import { matchesPermission } from './permissions.js';
import { toCherubimUser } from './user.js';
import type { CherubimUser } from './types.js';

export type ApiKeyKind = 'pat' | 'machine';

export interface GeneratedApiKey {
  /** Show once — never store this value. */
  plainText: string;
  /** SHA-256 hex of `plainText` — store this. */
  tokenHash: string;
  /** Short display prefix (e.g. `shm_a1b2c3d4`). */
  prefix: string;
}

/**
 * Stored credential — either a personal access token (PAT) or a machine API key.
 *
 * - `pat`: belongs to `userId`; inherits that user’s roles/permissions.
 *   Optional `abilities` narrow those permissions.
 * - `machine`: the key is the principal; `abilities` are its permissions.
 *   No user login required.
 */
export interface ApiKeyRecord {
  id: string;
  tokenHash: string;
  name?: string | null;
  /** Defaults: `userId` present → pat, else machine. */
  kind?: ApiKeyKind | null;
  /** Required for PATs — the owning user. */
  userId?: string | null;
  /**
   * PAT: optional narrow of the user’s permissions (empty = full user access).
   * Machine: the key’s permissions (e.g. `products:*`, `*`).
   */
  abilities?: string[];
  expiresAt?: Date | string | null;
  revokedAt?: Date | string | null;
}

export interface ApiKeyStore {
  findByTokenHash(hash: string): Promise<ApiKeyRecord | null>;
  touch?(id: string): Promise<void>;
}

export type LoadUserForApiKey = (userId: string) => Promise<CherubimUser | null>;

const DEFAULT_PREFIX = 'shm_';
/** 40 random bytes → 80 hex chars (≥40-char secret; ~320 bits). */
const SECRET_BYTES = 40;

/** SHA-256 hex digest of a plaintext API key. */
export function hashApiKey(plainText: string): string {
  return createHash('sha256').update(plainText, 'utf8').digest('hex');
}

/**
 * Generate a new credential. Persist `tokenHash` + `prefix` only;
 * return `plainText` to the client once.
 *
 * Format: `{prefix}{80 hex chars}` — e.g. `shm_` + 40 bytes of entropy.
 */
export function generateApiKey(options?: {
  prefix?: string;
  /** Random bytes for the secret (default 40 → 80 hex characters). */
  secretBytes?: number;
}): GeneratedApiKey {
  const prefix = options?.prefix ?? DEFAULT_PREFIX;
  const bytes = options?.secretBytes ?? SECRET_BYTES;
  const secret = randomBytes(Math.max(20, bytes)).toString('hex');
  const plainText = `${prefix}${secret}`;
  return {
    plainText,
    tokenHash: hashApiKey(plainText),
    prefix: plainText.slice(0, Math.min(12, plainText.length)),
  };
}

export type HeaderBag =
  | Record<string, string | string[] | undefined>
  | {
      authorization?: string | string[] | null;
      'x-api-key'?: string | string[] | null;
      'api-key'?: string | string[] | null;
      get?(name: string): string | undefined;
    };

export interface AuthCredentials {
  /**
   * Machine / gateway key from `X-Api-Key` (or `Api-Key`).
   * Use this for overall API access — keep it out of `Authorization`.
   */
  apiKey: string | null;
  /** User PAT (or single-credential token) from `Authorization: Bearer …`. */
  bearer: string | null;
}

function readHeader(headers: HeaderBag, name: string): string | undefined {
  if (typeof (headers as { get?(n: string): string | undefined }).get === 'function') {
    return (headers as { get(n: string): string | undefined }).get(name) ?? undefined;
  }
  const raw =
    (headers as Record<string, string | string[] | undefined>)[name] ??
    (headers as Record<string, string | string[] | undefined>)[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

/** `Authorization: Bearer <token>` — user PAT or single-credential mode. */
export function extractBearerToken(headers: HeaderBag): string | null {
  const authorization = readHeader(headers, 'authorization') ?? readHeader(headers, 'Authorization');
  if (!authorization) return null;
  const match = /^\s*Bearer\s+(\S+)\s*$/i.exec(authorization);
  return match?.[1] ?? null;
}

/**
 * Machine / gateway API key from a dedicated header.
 * Prefers `X-Api-Key`, then `Api-Key`. Do not use `Authorization` for this.
 */
export function extractMachineApiKey(headers: HeaderBag): string | null {
  const apiKey =
    readHeader(headers, 'x-api-key') ??
    readHeader(headers, 'X-Api-Key') ??
    readHeader(headers, 'api-key') ??
    readHeader(headers, 'Api-Key');
  const trimmed = apiKey?.trim();
  return trimmed || null;
}

/**
 * Split dual credentials for gateway + user auth:
 * - `X-Api-Key` / `Api-Key` → machine gateway key
 * - `Authorization: Bearer` → user PAT
 */
export function extractAuthCredentials(headers: HeaderBag): AuthCredentials {
  return {
    apiKey: extractMachineApiKey(headers),
    bearer: extractBearerToken(headers),
  };
}

/**
 * Single-credential fallback: Bearer first, then `X-Api-Key`.
 * Prefer {@link extractAuthCredentials} when both headers may be present.
 */
export function extractApiKey(headers: HeaderBag): string | null {
  const { bearer, apiKey } = extractAuthCredentials(headers);
  return bearer ?? apiKey;
}

/**
 * Narrow user permissions by PAT abilities.
 * Empty / missing abilities → full `userPermissions`.
 */
export function intersectPermissions(
  userPermissions: string[],
  keyAbilities?: string[] | null,
): string[] {
  if (!keyAbilities?.length) return [...userPermissions];

  const out = new Set<string>();
  for (const ability of keyAbilities) {
    if (matchesPermission(userPermissions, ability)) out.add(ability);
  }
  for (const perm of userPermissions) {
    if (matchesPermission(keyAbilities, perm)) out.add(perm);
  }
  return [...out];
}

function isExpired(value: Date | string | null | undefined): boolean {
  if (value == null || value === '') return false;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() <= Date.now();
}

function isRevoked(value: Date | string | null | undefined): boolean {
  if (value == null || value === '') return false;
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  return String(value).trim() !== '';
}

export function resolveApiKeyKind(record: ApiKeyRecord): ApiKeyKind {
  if (record.kind === 'pat' || record.kind === 'machine') return record.kind;
  return record.userId ? 'pat' : 'machine';
}

async function loadValidRecord(
  plainText: string,
  store: ApiKeyStore,
): Promise<ApiKeyRecord | null> {
  const trimmed = plainText?.trim();
  if (!trimmed) return null;

  const record = await store.findByTokenHash(hashApiKey(trimmed));
  if (!record) return null;
  if (isRevoked(record.revokedAt)) return null;
  if (isExpired(record.expiresAt)) return null;
  return record;
}

/**
 * Resolve a **machine** API key principal (no user login).
 * `abilities` become the CherubimUser permissions.
 */
export async function resolvePrincipalFromApiKey(
  plainText: string,
  store: ApiKeyStore,
): Promise<CherubimUser | null> {
  const record = await loadValidRecord(plainText, store);
  if (!record) return null;
  if (resolveApiKeyKind(record) === 'pat') return null;

  const abilities = Array.isArray(record.abilities)
    ? record.abilities.map(String).filter(Boolean)
    : [];

  void store.touch?.(record.id);

  const principal = toCherubimUser({
    id: `apikey:${record.id}`,
    name: record.name?.trim() || `API Key ${record.id}`,
    permissions: abilities,
    roleIds: [],
  });

  return {
    ...principal,
    apiKeyId: record.id,
    apiKeyAbilities: abilities,
  };
}

/**
 * Resolve a **personal access token** — authenticates as `userId`,
 * optionally narrowed by `abilities`.
 */
export async function resolveUserFromApiKey(
  plainText: string,
  store: ApiKeyStore,
  loadUser: LoadUserForApiKey,
): Promise<CherubimUser | null> {
  const record = await loadValidRecord(plainText, store);
  if (!record) return null;
  if (resolveApiKeyKind(record) !== 'pat' || !record.userId) return null;

  const user = await loadUser(record.userId);
  if (!user) return null;

  void store.touch?.(record.id);

  return {
    ...user,
    apiKeyId: record.id,
    apiKeyAbilities: Array.isArray(record.abilities) ? record.abilities : [],
  };
}

/**
 * Resolve either a PAT or a machine API key.
 * Pass `loadUser` so PATs can resolve; machine keys work without it.
 */
export async function resolveFromApiKey(
  plainText: string,
  store: ApiKeyStore,
  options?: { loadUser?: LoadUserForApiKey },
): Promise<CherubimUser | null> {
  const record = await loadValidRecord(plainText, store);
  if (!record) return null;

  const kind = resolveApiKeyKind(record);
  if (kind === 'pat') {
    if (!options?.loadUser || !record.userId) return null;
    return resolveUserFromApiKey(plainText, store, options.loadUser);
  }

  return resolvePrincipalFromApiKey(plainText, store);
}

/** True when the principal was authenticated as a machine API key. */
export function isMachineApiKeyPrincipal(user: CherubimUser | null | undefined): boolean {
  return Boolean(user?.apiKeyId && user.id.startsWith('apikey:'));
}
