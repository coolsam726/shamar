import type {
  DataAdapter,
  ListQuery,
  PaginatedResult,
  RelationSearchQuery,
  RelationSearchResult,
  ResourceMeta,
} from '@shamar/core';

/**
 * Lucid model contract — the adapter ducks-types against Lucid model statics.
 * Avoids hard importing @adonisjs/lucid so the package compiles standalone.
 */
interface LucidModelLike {
  query(options?: { connection?: string }): LucidQueryBuilder;
  create(data: Record<string, unknown>, options?: { connection?: string }): Promise<unknown>;
  findOrFail(id: unknown, options?: { connection?: string }): Promise<LucidRow>;
}

interface LucidQueryBuilder {
  where(clause: Record<string, unknown>): this;
  where(key: string, value: unknown): this;
  where(key: string, op: string, value: unknown): this;
  whereNot?(key: string, value: unknown): this;
  whereIn?(key: string, values: unknown[]): this;
  whereILike?(key: string, value: string): this;
  orWhere?(key: string, op: string, value: unknown): this;
  orWhereILike?(key: string, value: string): this;
  whereNull?(key: string): this;
  whereNotNull?(key: string): this;
  orderBy(field: string, direction: string): this;
  limit?(value: number): this;
  paginate(page: number, perPage: number): Promise<{ total: number; all(): LucidRow[] }>;
  first(): Promise<LucidRow | null>;
  delete(): Promise<void>;
}

interface LucidRow {
  $attributes: Record<string, unknown>;
  merge(data: Record<string, unknown>): this;
  save(): Promise<void>;
  delete(): Promise<void>;
  serialize(): Record<string, unknown>;
  toJSON(): Record<string, unknown>;
}

function resolveModel(meta: ResourceMeta): LucidModelLike {
  if (typeof meta.model === 'function') {
    return meta.model as unknown as LucidModelLike;
  }
  throw new Error(
    `Lucid adapter requires a model class on resource "${meta.slug}", got "${meta.model}"`,
  );
}

function toRecord(row: LucidRow): Record<string, unknown> {
  return typeof row.serialize === 'function' ? row.serialize() : row.toJSON();
}

/**
 * Create a Shamar DataAdapter backed by Lucid models.
 *
 * Each resource can specify `connection` to use a named Lucid connection
 * (maps directly to `config/database.ts` connection names).
 */
export function createLucidAdapter(): DataAdapter {
  return {
    async list(meta, query) {
      return listLucid(meta, query);
    },
    async findOne(meta, id) {
      return findOneLucid(meta, id);
    },
    async create(meta, data) {
      return createLucid(meta, data);
    },
    async update(meta, id, data) {
      return updateLucid(meta, id, data);
    },
    async delete(meta, id) {
      return deleteLucid(meta, id);
    },
    async exists(meta, column, value, options) {
      return existsLucid(meta, column, value, options);
    },
    async search(meta, query) {
      return searchLucid(meta, query);
    },
  };
}

async function listLucid(
  meta: ResourceMeta,
  query: ListQuery,
): Promise<PaginatedResult> {
  const Model = resolveModel(meta);
  const qb = Model.query({ connection: meta.connection });

  // Search across searchable fields
  if (query.search && meta.searchableFields.length > 0) {
    const term = `%${query.search}%`;
    const [first, ...rest] = meta.searchableFields;
    if (first) {
      if (typeof qb.whereILike === 'function') {
        qb.whereILike(first, term);
      } else {
        qb.where(first, 'LIKE', term);
      }
      for (const field of rest) {
        if (typeof (qb as unknown as { orWhereILike(k: string, v: string): void }).orWhereILike === 'function') {
          (qb as unknown as { orWhereILike(k: string, v: string): void }).orWhereILike(field, term);
        } else {
          (qb as unknown as { orWhere(k: string, op: string, v: string): void }).orWhere(field, 'LIKE', term);
        }
      }
    }
  }

  // Scope (equality filters from policies/tenancy)
  if (query.scope) {
    for (const [key, value] of Object.entries(query.scope)) {
      qb.where(key, value);
    }
  }

  // Soft-delete: exclude trashed by default
  if (meta.softDelete) {
    const field =
      typeof meta.softDelete === 'object' ? meta.softDelete.field ?? 'deletedAt' : 'deletedAt';
    if (typeof qb.whereNull === 'function') {
      qb.whereNull(field);
    }
  }

  // Sort
  const sortField = query.sort ?? meta.defaultSort?.field ?? 'id';
  const sortDir = query.direction ?? meta.defaultSort?.direction ?? 'desc';
  qb.orderBy(sortField, sortDir);

  const paginated = await qb.paginate(query.page, query.perPage);
  const items = paginated.all().map(toRecord);

  return {
    items,
    total: paginated.total,
    page: query.page,
    perPage: query.perPage,
    pageCount: Math.ceil(paginated.total / query.perPage),
  };
}

async function findOneLucid(
  meta: ResourceMeta,
  id: string,
): Promise<Record<string, unknown>> {
  const Model = resolveModel(meta);
  const row = await Model.findOrFail(id, { connection: meta.connection });
  return toRecord(row);
}

async function createLucid(
  meta: ResourceMeta,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const Model = resolveModel(meta);
  const row = (await Model.create(data, {
    connection: meta.connection,
  })) as LucidRow;
  return toRecord(row);
}

async function updateLucid(
  meta: ResourceMeta,
  id: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const Model = resolveModel(meta);
  const row = await Model.findOrFail(id, { connection: meta.connection });
  row.merge(data);
  await row.save();
  return toRecord(row);
}

async function existsLucid(
  meta: ResourceMeta,
  column: string,
  value: unknown,
  options?: { excludeId?: string },
): Promise<boolean> {
  const Model = resolveModel(meta);
  const qb = Model.query({ connection: meta.connection });
  qb.where(column, value);

  if (options?.excludeId) {
    if (typeof qb.whereNot === 'function') {
      qb.whereNot('id', options.excludeId);
    } else {
      qb.where('id', '!=', options.excludeId);
    }
  }

  if (meta.softDelete) {
    const field =
      typeof meta.softDelete === 'object' ? meta.softDelete.field ?? 'deletedAt' : 'deletedAt';
    if (typeof qb.whereNull === 'function') {
      qb.whereNull(field);
    }
  }

  const row = await qb.first();
  return row != null;
}

async function deleteLucid(
  meta: ResourceMeta,
  id: string,
): Promise<void> {
  const Model = resolveModel(meta);
  const row = await Model.findOrFail(id, { connection: meta.connection });

  if (meta.softDelete) {
    const field =
      typeof meta.softDelete === 'object'
        ? meta.softDelete.field ?? 'deletedAt'
        : 'deletedAt';
    row.merge({ [field]: new Date() });
    await row.save();
  } else {
    await row.delete();
  }
}

async function searchLucid(
  meta: ResourceMeta,
  query: RelationSearchQuery,
): Promise<RelationSearchResult[]> {
  const Model = resolveModel(meta);
  const qb = Model.query({ connection: meta.connection });
  const titleAttribute = query.titleAttribute;
  const limit = Math.min(250, Math.max(1, query.limit ?? 25));

  if (query.ids && query.ids.length > 0) {
    if (typeof qb.whereIn === 'function') {
      qb.whereIn('id', query.ids);
    } else {
      qb.where('id', query.ids[0]);
      for (const id of query.ids.slice(1)) {
        if (typeof qb.orWhere === 'function') {
          qb.orWhere('id', '=', id);
        }
      }
    }
  } else if (query.q?.trim()) {
    const term = `%${query.q.trim()}%`;
    if (typeof qb.whereILike === 'function') {
      qb.whereILike(titleAttribute, term);
    } else {
      qb.where(titleAttribute, 'LIKE', term);
    }
  }

  if (query.scope) {
    for (const [key, value] of Object.entries(query.scope)) {
      qb.where(key, value);
    }
  }

  if (meta.softDelete) {
    const field =
      typeof meta.softDelete === 'object' ? meta.softDelete.field ?? 'deletedAt' : 'deletedAt';
    if (typeof qb.whereNull === 'function') {
      qb.whereNull(field);
    }
  }

  qb.orderBy(titleAttribute, 'asc');
  const paginated = await qb.paginate(1, limit);
  return paginated.all().map((row) => {
    const record = toRecord(row);
    const result: RelationSearchResult = {
      id: String(record.id ?? ''),
      label: String(record[titleAttribute] ?? record.id ?? ''),
    };
    if (record.name != null && record.name !== '') {
      result.name = String(record.name);
    }
    if (record.resource != null && record.resource !== '') {
      result.group = String(record.resource);
    }
    if (record.ability != null && record.ability !== '') {
      result.ability = String(record.ability);
    }
    return result;
  });
}
