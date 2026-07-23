import type { ResourceMeta } from '@shamar/core';
import type { OpenApiOperation, OpenApiPathItem, OpenApiParameter } from '../types.js';
import { schemaName } from './schemas.js';

function ref(name: string) {
  return { $ref: `#/components/schemas/${name}` };
}

const listQueryParams: OpenApiParameter[] = [
  {
    name: 'page',
    in: 'query',
    schema: { type: 'integer', minimum: 1 },
    description: 'Page number (1-based)',
  },
  {
    name: 'perPage',
    in: 'query',
    schema: { type: 'integer', minimum: 1 },
    description: 'Page size (or `all`)',
  },
  {
    name: 'search',
    in: 'query',
    schema: { type: 'string' },
    description: 'Full-text search across searchable fields',
  },
  {
    name: 'sort',
    in: 'query',
    schema: { type: 'string' },
    description: 'Sort field name',
  },
  {
    name: 'direction',
    in: 'query',
    schema: { type: 'string', enum: ['asc', 'desc'] },
  },
  {
    name: 'filters',
    in: 'query',
    schema: { type: 'string' },
    description: 'JSON-encoded list filters',
  },
  {
    name: 'groupBy',
    in: 'query',
    schema: { type: 'string' },
    description: 'Group-by field name',
  },
];

const idParam: OpenApiParameter = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { oneOf: [{ type: 'string' }, { type: 'number' }] },
  description: 'Record id',
};

function errorResponses(): OpenApiOperation['responses'] {
  return {
    '400': {
      description: 'Bad request / validation error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              errors: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    '401': { description: 'Unauthorized' },
    '403': { description: 'Forbidden' },
    '404': { description: 'Not found' },
  };
}

function joinPath(prefix: string, suffix: string): string {
  const base = prefix.replace(/\/+$/, '');
  const path = suffix.startsWith('/') ? suffix : `/${suffix}`;
  if (!base || base === '/') return path;
  return `${base}${path}`;
}

export function resourcePaths(
  meta: ResourceMeta,
  apiPrefix = '/api/shamar',
): Record<string, OpenApiPathItem> {
  const tag = meta.label;
  const collection = joinPath(apiPrefix, `/${meta.slug}`);
  const item = joinPath(apiPrefix, `/${meta.slug}/{id}`);
  const readName = schemaName(meta.slug, 'Record');
  const createName = schemaName(meta.slug, 'Create');
  const updateName = schemaName(meta.slug, 'Update');
  const listName = schemaName(meta.slug, 'List');
  const errors = errorResponses();

  const collectionPath: OpenApiPathItem = {
    get: {
      operationId: `${meta.slug}.index`,
      summary: `List ${meta.label}`,
      tags: [tag],
      parameters: listQueryParams,
      responses: {
        '200': {
          description: `Paginated ${meta.label}`,
          content: {
            'application/json': { schema: ref(listName) },
          },
        },
        ...errors,
      },
    },
    post: {
      operationId: `${meta.slug}.store`,
      summary: `Create ${meta.singularLabel}`,
      tags: [tag],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: ref(createName) },
        },
      },
      responses: {
        '201': {
          description: `Created ${meta.singularLabel}`,
          content: {
            'application/json': { schema: ref(readName) },
          },
        },
        ...errors,
      },
    },
  };

  const itemPath: OpenApiPathItem = {
    parameters: [idParam],
    get: {
      operationId: `${meta.slug}.show`,
      summary: `Get ${meta.singularLabel}`,
      tags: [tag],
      responses: {
        '200': {
          description: meta.singularLabel,
          content: {
            'application/json': { schema: ref(readName) },
          },
        },
        ...errors,
      },
    },
    put: {
      operationId: `${meta.slug}.update`,
      summary: `Update ${meta.singularLabel}`,
      tags: [tag],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: ref(updateName) },
        },
      },
      responses: {
        '200': {
          description: `Updated ${meta.singularLabel}`,
          content: {
            'application/json': { schema: ref(readName) },
          },
        },
        ...errors,
      },
    },
    delete: {
      operationId: `${meta.slug}.destroy`,
      summary: `Delete ${meta.singularLabel}`,
      tags: [tag],
      responses: {
        '204': { description: 'Deleted' },
        ...errors,
      },
    },
  };

  return {
    [collection]: collectionPath,
    [item]: itemPath,
  };
}
