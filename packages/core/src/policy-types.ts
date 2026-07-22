import type { ShamarUser } from './types.js';

/** Loom / Filament policy abilities. */
export type PolicyAbility = 'viewAny' | 'view' | 'create' | 'edit' | 'delete';

/** Equality filters applied to list queries (record-level scoping). */
export interface QueryScope {
  equals?: Record<string, unknown>;
}

/**
 * Policy class contract — Loom-style static methods.
 * Assign to `Resource.policy` or register in `auth.policies`.
 */
export type PolicyClass = {
  new (...args: unknown[]): unknown;
  ownerField?: string;
  viewAny?(user: ShamarUser, slug?: string): boolean;
  view?(user: ShamarUser, record: Record<string, unknown>, slug?: string): boolean;
  create?(user: ShamarUser, slug?: string): boolean;
  edit?(user: ShamarUser, record: Record<string, unknown>, slug?: string): boolean;
  delete?(user: ShamarUser, record: Record<string, unknown>, slug?: string): boolean;
  scopeList?(user: ShamarUser, slug?: string): QueryScope | undefined;
};

export const POLICY_ABILITIES: PolicyAbility[] = [
  'viewAny',
  'view',
  'create',
  'edit',
  'delete',
];
