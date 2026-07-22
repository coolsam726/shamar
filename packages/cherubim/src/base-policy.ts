import type { PolicyClass, ShamarUser } from '@shamar/core';
import { can } from '@shamar/core';
import type { PolicyAbility } from './policy.js';
import { toPolicyAbility } from './policy.js';
import type { ResourceAction } from './types.js';

type InstancePolicyMethod = (
  user: ShamarUser,
  record?: Record<string, unknown>,
) => boolean | Promise<boolean>;

/**
 * Laravel / Adonis-style policy base with instance methods.
 *
 * @example
 * export default class PostPolicy extends BasePolicy {
 *   update(user: User, post: Post) {
 *     return this.allows(user, 'posts:edit') && post.userId === user.id
 *   }
 * }
 */
export abstract class BasePolicy {
  protected allows(user: ShamarUser, permission: string): boolean {
    return can(user, permission);
  }

  protected denies(_user: ShamarUser, _permission?: string): false {
    return false;
  }
}

const INSTANCE_ACTION_MAP: Record<PolicyAbility, string[]> = {
  viewAny: ['viewAny'],
  view: ['view'],
  create: ['create', 'store'],
  edit: ['edit', 'update'],
  delete: ['delete', 'destroy'],
};

/**
 * Wrap an Adonis/Laravel instance policy as a Loom static `PolicyClass`.
 */
export function instancePolicy(
  PolicyCtor: new () => BasePolicy,
  slug: string,
): PolicyClass {
  const invoke = (method: string, user: ShamarUser, record?: Record<string, unknown>) => {
    const instance = new PolicyCtor();
    const handler = (instance as unknown as Record<string, InstancePolicyMethod | undefined>)[
      method
    ];
    if (typeof handler !== 'function') return undefined;
    const result = handler.call(instance, user, record);
    return result === true;
  };

  return class AdonisPolicyAdapter {
    static viewAny(user: ShamarUser) {
      for (const method of INSTANCE_ACTION_MAP.viewAny) {
        const result = invoke(method, user);
        if (result !== undefined) return result;
      }
      return undefined;
    }

    static view(user: ShamarUser, record: Record<string, unknown>) {
      for (const method of INSTANCE_ACTION_MAP.view) {
        const result = invoke(method, user, record);
        if (result !== undefined) return result;
      }
      return undefined;
    }

    static create(user: ShamarUser) {
      for (const method of INSTANCE_ACTION_MAP.create) {
        const result = invoke(method, user);
        if (result !== undefined) return result;
      }
      return undefined;
    }

    static edit(user: ShamarUser, record: Record<string, unknown>) {
      for (const method of INSTANCE_ACTION_MAP.edit) {
        const result = invoke(method, user, record);
        if (result !== undefined) return result;
      }
      return undefined;
    }

    static delete(user: ShamarUser, record: Record<string, unknown>) {
      for (const method of INSTANCE_ACTION_MAP.delete) {
        const result = invoke(method, user, record);
        if (result !== undefined) return result;
      }
      return undefined;
    }
  } as PolicyClass;
}

export function actionPermission(slug: string, action: ResourceAction): string {
  return `${slug}:${toPolicyAbility(action)}`;
}
