import type {
  DataAdapter,
  ListQuery,
  PaginatedResult,
  RelationSearchQuery,
  RelationSearchResult,
  ResourceMeta,
} from '@shamar/core';

/**
 * Minimal Mongoose model / connection contracts.
 * Duck-typed so the package compiles without a hard mongoose import.
 */
export interface MongooseModelLike {
  find(filter: Record<string, unknown>): MongooseQueryLike;
  findOne(filter: Record<string, unknown>): { lean(): Promise<unknown> };
  countDocuments(filter: Record<string, unknown>): Promise<number>;
  findById(id: string): { lean(): Promise<unknown> };
  create(data: Record<string, unknown>): Promise<unknown>;
  findByIdAndUpdate(
    id: string,
    data: Record<string, unknown>,
    options: Record<string, unknown>,
  ): Promise<unknown>;
  findByIdAndDelete(id: string): Promise<unknown>;
}

export interface MongooseQueryLike {
  sort(value: Record<string, number>): {
    skip(value: number): {
      limit(value: number): { lean(): Promise<unknown[]> };
    };
  };
}

export interface MongooseConnectionLike {
  model(name: string): MongooseModelLike;
}

export interface MongooseAdapterOptions {
  /** Used when resource.model is a string model name. */
  connection?: MongooseConnectionLike;
}

function isMongooseModel(value: unknown): value is MongooseModelLike {
  if (typeof value !== 'function' && (typeof value !== 'object' || value === null)) {
    return false;
  }
  const candidate = value as Partial<MongooseModelLike>;
  return (
    typeof candidate.find === 'function' &&
    typeof candidate.findById === 'function' &&
    typeof candidate.create === 'function'
  );
}

function modelKey(meta: ResourceMeta): string {
  if (typeof meta.model === 'string') return meta.model;
  if (typeof meta.model === 'function') {
    return (meta.model as { modelName?: string; name?: string }).modelName
      ?? (meta.model as { name?: string }).name
      ?? 'Model';
  }
  return String(meta.model);
}

function resolveModel(
  meta: ResourceMeta,
  connection?: MongooseConnectionLike,
): MongooseModelLike {
  if (isMongooseModel(meta.model)) {
    return meta.model;
  }

  if (typeof meta.model === 'string' && connection) {
    return connection.model(meta.model);
  }

  throw new Error(
    `Mongoose adapter requires a Mongoose model class or string model name + connection on resource "${meta.slug}"`,
  );
}

function softDeleteField(meta: ResourceMeta): string | null {
  if (!meta.softDelete) return null;
  if (typeof meta.softDelete === 'object') {
    return meta.softDelete.field ?? 'deletedAt';
  }
  return 'deletedAt';
}

function softDeleteStamp(meta: ResourceMeta): Record<string, unknown> | null {
  const field = softDeleteField(meta);
  if (!field) return null;
  return { [field]: new Date() };
}

function softDeleteWhere(meta: ResourceMeta): Record<string, unknown> {
  const field = softDeleteField(meta);
  if (!field) return {};
  return {
    $or: [{ [field]: null }, { [field]: { $exists: false } }],
  };
}

function buildMongoSearch(meta: ResourceMeta, search?: string): Record<string, unknown> {
  if (!search?.trim() || meta.searchableFields.length === 0) return {};
  return {
    $or: meta.searchableFields.map((field) => ({
      [field]: { $regex: search.trim(), $options: 'i' },
    })),
  };
}

function assertMongoId(id: string): void {
  if (!id?.trim() || !/^[a-f\d]{24}$/i.test(id)) {
    throw new Error('Record not found');
  }
}

function serializeValue(entry: unknown): unknown {
  if (entry instanceof Date) {
    return entry.toISOString();
  }
  if (entry && typeof entry === 'object') {
    const bson = entry as { _bsontype?: string; toHexString?: () => string };
    if (bson._bsontype === 'ObjectId' || bson._bsontype === 'ObjectID') {
      return bson.toHexString?.() ?? String(entry);
    }
  }
  return entry;
}

function toPlainRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  const record = value as {
    toObject?: () => Record<string, unknown>;
    toJSON?: () => Record<string, unknown>;
  };
  if (typeof record.toObject === 'function') return record.toObject();
  if (typeof record.toJSON === 'function') {
    return record.toJSON() as Record<string, unknown>;
  }
  return value as Record<string, unknown>;
}

function finalizeRecord(value: unknown): Record<string, unknown> {
  const plain = toPlainRecord(value);
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(plain)) {
    out[key] = serializeValue(entry);
  }
  if (out._id !== undefined && (out.id === undefined || out.id === '')) {
    out.id = String(out._id);
  }
  return out;
}

function mergeFilter(parts: Record<string, unknown>[]): Record<string, unknown> {
  const nonempty = parts.filter((part) => Object.keys(part).length > 0);
  if (nonempty.length === 0) return {};
  if (nonempty.length === 1) return nonempty[0]!;
  return { $and: nonempty };
}

/**
 * Create a Shamar DataAdapter backed by Mongoose models.
 *
 * Pass `connection` when resources use string model names
 * (`static model = 'Product'`). Model classes are used directly.
 */
export function createMongooseAdapter(
  options: MongooseAdapterOptions = {},
): DataAdapter {
  const { connection } = options;

  return {
    async list(meta, query) {
      return listMongoose(meta, query, connection);
    },
    async findOne(meta, id) {
      return findOneMongoose(meta, id, connection);
    },
    async create(meta, data) {
      return createMongoose(meta, data, connection);
    },
    async update(meta, id, data) {
      return updateMongoose(meta, id, data, connection);
    },
    async delete(meta, id) {
      return deleteMongoose(meta, id, connection);
    },
    async exists(meta, column, value, options) {
      return existsMongoose(meta, column, value, options, connection);
    },
    async search(meta, query) {
      return searchMongoose(meta, query, connection);
    },
  };
}

async function listMongoose(
  meta: ResourceMeta,
  query: ListQuery,
  connection?: MongooseConnectionLike,
): Promise<PaginatedResult> {
  const Model = resolveModel(meta, connection);
  const filter = mergeFilter([
    buildMongoSearch(meta, query.search),
    query.scope ? { ...query.scope } : {},
    softDeleteWhere(meta),
  ]);

  const sortField = query.sort ?? meta.defaultSort?.field ?? 'createdAt';
  const sortDir = (query.direction ?? meta.defaultSort?.direction ?? 'desc') === 'asc' ? 1 : -1;
  const skip = (query.page - 1) * query.perPage;

  const [items, total] = await Promise.all([
    Model.find(filter)
      .sort({ [sortField]: sortDir })
      .skip(skip)
      .limit(query.perPage)
      .lean(),
    Model.countDocuments(filter),
  ]);

  return {
    items: items.map(finalizeRecord),
    total,
    page: query.page,
    perPage: query.perPage,
    pageCount: Math.max(1, Math.ceil(total / query.perPage)),
  };
}

async function findOneMongoose(
  meta: ResourceMeta,
  id: string,
  connection?: MongooseConnectionLike,
): Promise<Record<string, unknown>> {
  assertMongoId(id);
  const Model = resolveModel(meta, connection);
  const record = await Model.findById(id).lean();
  if (!record) throw new Error('Record not found');
  return finalizeRecord(record);
}

async function createMongoose(
  meta: ResourceMeta,
  data: Record<string, unknown>,
  connection?: MongooseConnectionLike,
): Promise<Record<string, unknown>> {
  const Model = resolveModel(meta, connection);
  const record = await Model.create(data);
  return finalizeRecord(record);
}

async function updateMongoose(
  meta: ResourceMeta,
  id: string,
  data: Record<string, unknown>,
  connection?: MongooseConnectionLike,
): Promise<Record<string, unknown>> {
  assertMongoId(id);
  const Model = resolveModel(meta, connection);
  const record = await Model.findByIdAndUpdate(id, data, { new: true });
  if (!record) throw new Error('Record not found');
  return finalizeRecord(record);
}

async function existsMongoose(
  meta: ResourceMeta,
  column: string,
  value: unknown,
  options: { excludeId?: string } | undefined,
  connection?: MongooseConnectionLike,
): Promise<boolean> {
  const Model = resolveModel(meta, connection);
  const parts: Record<string, unknown>[] = [
    { [column]: value },
    softDeleteWhere(meta),
  ];
  if (options?.excludeId) {
    assertMongoId(options.excludeId);
    parts.push({ _id: { $ne: options.excludeId } });
  }
  const filter = mergeFilter(parts);
  const count = await Model.countDocuments(filter);
  return count > 0;
}

async function deleteMongoose(
  meta: ResourceMeta,
  id: string,
  connection?: MongooseConnectionLike,
): Promise<void> {
  assertMongoId(id);
  const stamp = softDeleteStamp(meta);
  if (stamp) {
    await updateMongoose(meta, id, stamp, connection);
    return;
  }
  const Model = resolveModel(meta, connection);
  await Model.findByIdAndDelete(id);
}

async function searchMongoose(
  meta: ResourceMeta,
  query: RelationSearchQuery,
  connection?: MongooseConnectionLike,
): Promise<RelationSearchResult[]> {
  const Model = resolveModel(meta, connection);
  const titleAttribute = query.titleAttribute;
  const limit = Math.min(250, Math.max(1, query.limit ?? 25));
  const parts: Record<string, unknown>[] = [softDeleteWhere(meta)];

  if (query.ids && query.ids.length > 0) {
    const validIds = query.ids.filter((id) => /^[a-f\d]{24}$/i.test(id));
    if (validIds.length === 0) return [];
    parts.push({ _id: { $in: validIds } });
  } else if (query.q?.trim()) {
    parts.push({
      [titleAttribute]: { $regex: query.q.trim(), $options: 'i' },
    });
  }

  if (query.scope) {
    parts.push({ ...query.scope });
  }

  const filter = mergeFilter(parts);
  const rows = await Model.find(filter)
    .sort({ [titleAttribute]: 1 })
    .skip(0)
    .limit(limit)
    .lean();

  return rows.map((row) => {
    const record = finalizeRecord(row);
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
