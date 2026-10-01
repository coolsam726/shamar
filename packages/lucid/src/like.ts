/**
 * LIKE/ILIKE helpers.
 *
 * A raw search of `\` is an incomplete escape in Postgres and MySQL and
 * raises "LIKE pattern must not end with escape character". `%` and `_` are
 * wildcards. Escape them and declare `\` as the escape character.
 */

export interface LikeQuery {
  whereRaw?(sql: string, bindings?: unknown[]): unknown;
  orWhereRaw?(sql: string, bindings?: unknown[]): unknown;
  whereILike?(key: string, value: string): unknown;
  orWhereILike?(key: string, value: string): unknown;
  where?(key: string, op: string, value: unknown): unknown;
  orWhere?(key: string, op: string, value: unknown): unknown;
  client?: { dialect?: { name?: string } | string };
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export function containsLikePattern(value: string): string {
  return `%${escapeLike(value)}%`;
}

function likeOperator(builder: LikeQuery): 'ilike' | 'like' {
  const dialect = builder.client?.dialect;
  const name = typeof dialect === 'string' ? dialect : dialect?.name;
  return name === 'postgres' || name === 'redshift' ? 'ilike' : 'like';
}

/** Case-insensitive contains match. User text is matched literally. */
export function whereContains(builder: LikeQuery, column: string, value: string, or = false): void {
  const pattern = containsLikePattern(value);
  const raw = or ? builder.orWhereRaw : builder.whereRaw;
  if (typeof raw === 'function') {
    raw.call(builder, `?? ${likeOperator(builder)} ? escape ?`, [column, pattern, '\\']);
    return;
  }

  const iLike = or ? builder.orWhereILike : builder.whereILike;
  if (typeof iLike === 'function') {
    iLike.call(builder, column, pattern);
    return;
  }

  const where = or ? builder.orWhere : builder.where;
  where?.call(builder, column, 'LIKE', pattern);
}
