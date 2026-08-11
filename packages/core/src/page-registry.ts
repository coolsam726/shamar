import type { PageMeta } from './page.js';
import type { Page, PageClass } from './page.js';

export class PageRegistry {
  private readonly meta = new Map<string, PageMeta>();
  private readonly classes = new Map<string, PageClass>();

  constructor(pageClasses: PageClass[] = []) {
    for (const PageClass of pageClasses) {
      const configured = PageClass.configure();
      if (this.meta.has(configured.slug)) {
        throw new Error(`Duplicate Shamar page slug: ${configured.slug}`);
      }
      this.meta.set(configured.slug, configured);
      this.classes.set(configured.slug, PageClass);
    }
  }

  all(): PageMeta[] {
    return [...this.meta.values()];
  }

  get(slug: string): PageMeta | undefined {
    return this.meta.get(slug);
  }

  require(slug: string): PageMeta {
    const meta = this.get(slug);
    if (!meta) throw new Error(`Unknown Shamar page: ${slug}`);
    return meta;
  }

  pageClass(slug: string): PageClass | undefined {
    return this.classes.get(slug);
  }

  has(slug: string): boolean {
    return this.meta.has(slug);
  }

  /** Pages visible in panel navigation. */
  navigationItems(): PageMeta[] {
    return this.all()
      .filter((page) => !page.navigationHidden)
      .sort((a, b) => {
        const sortA = a.navigationSort ?? Number.POSITIVE_INFINITY;
        const sortB = b.navigationSort ?? Number.POSITIVE_INFINITY;
        if (sortA !== sortB) return sortA - sortB;
        return a.label.localeCompare(b.label);
      });
  }
}

export type { Page };
