import type { ResourceMeta } from './types.js';
import type { Resource } from './resource.js';

export class ResourceRegistry {
  private readonly meta = new Map<string, ResourceMeta>();
  private readonly classes = new Map<string, typeof Resource>();

  constructor(resourceClasses: Array<typeof Resource>) {
    for (const ResourceClass of resourceClasses) {
      const configured = ResourceClass.configure();
      if (this.meta.has(configured.slug)) {
        throw new Error(`Duplicate Shamar resource slug: ${configured.slug}`);
      }
      this.meta.set(configured.slug, configured);
      this.classes.set(configured.slug, ResourceClass);
    }
  }

  all(): ResourceMeta[] {
    return [...this.meta.values()];
  }

  get(slug: string): ResourceMeta | undefined {
    return this.meta.get(slug);
  }

  require(slug: string): ResourceMeta {
    const meta = this.get(slug);
    if (!meta) throw new Error(`Unknown Shamar resource: ${slug}`);
    return meta;
  }

  resourceClass(slug: string): typeof Resource | undefined {
    return this.classes.get(slug);
  }

  navigationGroups(): Array<{ name: string; items: ResourceMeta[] }> {
    const groups = new Map<string, ResourceMeta[]>();
    for (const meta of this.all()) {
      const group = meta.navigationGroup ?? 'General';
      const items = groups.get(group) ?? [];
      items.push(meta);
      groups.set(group, items);
    }
    return [...groups.entries()].map(([name, items]) => ({
      name,
      items: items.sort((a, b) => {
        const sortA = a.navigationSort ?? Number.POSITIVE_INFINITY;
        const sortB = b.navigationSort ?? Number.POSITIVE_INFINITY;
        if (sortA !== sortB) return sortA - sortB;
        return a.label.localeCompare(b.label);
      }),
    }));
  }
}
