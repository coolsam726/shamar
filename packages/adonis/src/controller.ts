import type { DataAdapter, ResourceMeta } from '@shamar/core';
import { validateFormData } from '@shamar/core';

/**
 * Resource controller that handles admin CRUD for a single resource.
 *
 * In a real Adonis app this would use `HttpContext` from `@adonisjs/core/http`.
 * For now the contract is duck-typed so it compiles standalone.
 */
export class ResourceController {
  constructor(
    private adapter: DataAdapter,
  ) {}

  /** GET /admin/:slug — list page or JSON. */
  async index(meta: ResourceMeta, query: {
    page?: number;
    perPage?: number;
    search?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
    scope?: Record<string, unknown>;
  }) {
    return this.adapter.list(meta, {
      page: query.page ?? 1,
      perPage: query.perPage ?? 15,
      search: query.search,
      sort: query.sort,
      direction: query.direction,
      scope: query.scope,
    });
  }

  /** GET /admin/:slug/:id — detail. */
  async show(meta: ResourceMeta, id: string) {
    return this.adapter.findOne(meta, id);
  }

  /** POST /admin/:slug — create. */
  async store(meta: ResourceMeta, data: Record<string, unknown>) {
    await validateFormData(meta, data, this.adapter);
    return this.adapter.create(meta, data);
  }

  /** PUT /admin/:slug/:id — update. */
  async update(meta: ResourceMeta, id: string, data: Record<string, unknown>) {
    await validateFormData(meta, data, this.adapter, { recordId: id });
    return this.adapter.update(meta, id, data);
  }

  /** DELETE /admin/:slug/:id — delete. */
  async destroy(meta: ResourceMeta, id: string) {
    return this.adapter.delete(meta, id);
  }
}
