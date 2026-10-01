import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export interface WireSnapshot {
  id: string;
  name: string;
  data: Record<string, unknown>;
  checksum: string;
  /** Stable child islands, keyed by slot name. Each child is signed on its own. */
  children?: Record<string, WireSnapshot>;
}

export function newComponentId(): string {
  return randomBytes(8).toString('hex');
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonical(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
}

export function signSnapshot(
  secret: string,
  snapshot: Omit<WireSnapshot, 'checksum'>,
): WireSnapshot {
  const checksum = createHmac('sha256', secret)
    .update(
      `${snapshot.id}:${snapshot.name}:${canonical(snapshot.data)}:${canonical(snapshot.children ?? null)}`,
    )
    .digest('hex');
  return { ...snapshot, checksum };
}

export function verifySnapshot(secret: string, snapshot: WireSnapshot): boolean {
  const expected = signSnapshot(secret, {
    id: snapshot.id,
    name: snapshot.name,
    data: snapshot.data,
    children: snapshot.children,
  });
  const left = Buffer.from(expected.checksum);
  const right = Buffer.from(String(snapshot.checksum ?? ''));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
