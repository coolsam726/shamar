import type { PolicyClass } from '@shamar/core';
import type { ResourceClass } from './types.js';

/**
 * Registry of policy classes keyed by resource slug.
 * Merges `Resource.policy` with explicit `auth.policies` registrations.
 */
export class PolicyRegistry {
  private readonly policies = new Map<string, PolicyClass>();

  register(slug: string, policy: PolicyClass): this {
    this.policies.set(slug, policy);
    return this;
  }

  registerMany(entries: Record<string, PolicyClass>): this {
    for (const [slug, policy] of Object.entries(entries)) {
      this.register(slug, policy);
    }
    return this;
  }

  /** Seed from resource classes and apply registry policies to resources. */
  registerResources(resources: ResourceClass[]): this {
    for (const ResourceClass of resources) {
      const registered = this.policies.get(ResourceClass.slug);
      if (ResourceClass.policy) {
        this.policies.set(ResourceClass.slug, ResourceClass.policy);
      } else if (registered) {
        ResourceClass.policy = registered;
      }
    }
    return this;
  }

  get(slug: string): PolicyClass | undefined {
    return this.policies.get(slug);
  }

  resolve(slug: string, ResourceClass?: ResourceClass): PolicyClass | undefined {
    return this.policies.get(slug) ?? ResourceClass?.policy;
  }
}
