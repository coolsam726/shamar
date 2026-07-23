import type { FieldConfig, FieldType, ResourceMeta } from '@shamar/core';
import type { OpenApiSchema } from '../types.js';

function isRequired(field: FieldConfig): boolean {
  return field.required === true;
}

function labelOf(field: FieldConfig): string | undefined {
  return typeof field.label === 'string' ? field.label : undefined;
}

export function fieldToSchema(field: FieldConfig): OpenApiSchema {
  const base: OpenApiSchema = {};
  const label = labelOf(field);
  if (label) base.description = label;
  if (typeof field.help === 'string') {
    base.description = base.description
      ? `${base.description}. ${field.help}`
      : field.help;
  }

  if (field.type === 'password') base.writeOnly = true;
  if (field.readonly === true) base.readOnly = true;

  const type = field.type as FieldType;

  if (field.options?.length) {
    const values = field.options.map((opt) => opt.value);
    const allString = values.every((v) => typeof v === 'string');
    const allNumber = values.every((v) => typeof v === 'number');
    return {
      ...base,
      type: allNumber ? 'number' : allString ? 'string' : undefined,
      enum: values as Array<string | number>,
      description:
        base.description ??
        field.options.map((opt) => `${opt.value}: ${opt.label}`).join(', '),
    };
  }

  switch (type) {
    case 'number':
      return {
        ...base,
        type: 'number',
        minimum: typeof field.minValue === 'number' ? field.minValue : undefined,
        maximum: typeof field.maxValue === 'number' ? field.maxValue : undefined,
      };
    case 'boolean':
    case 'checkbox':
      return { ...base, type: 'boolean' };
    case 'date':
      return { ...base, type: 'string', format: 'date' };
    case 'datetime':
      return { ...base, type: 'string', format: 'date-time' };
    case 'email':
      return {
        ...base,
        type: 'string',
        format: 'email',
        minLength: field.minLength,
        maxLength: field.maxLength,
      };
    case 'url':
      return {
        ...base,
        type: 'string',
        format: 'uri',
        minLength: field.minLength,
        maxLength: field.maxLength,
      };
    case 'password':
      return {
        ...base,
        type: 'string',
        format: 'password',
        writeOnly: true,
        minLength: field.minLength,
        maxLength: field.maxLength,
      };
    case 'tel':
      return {
        ...base,
        type: 'string',
        minLength: field.minLength,
        maxLength: field.maxLength,
      };
    case 'textarea':
    case 'text':
    case 'color':
    case 'hidden':
      return {
        ...base,
        type: 'string',
        minLength: field.minLength,
        maxLength: field.maxLength,
        pattern: field.pattern,
      };
    case 'tags':
    case 'checkboxList':
      return {
        ...base,
        type: 'array',
        items: { type: 'string' },
      };
    case 'select':
    case 'radio':
      return { ...base, type: 'string' };
    case 'relation':
      if (field.relation?.kind === 'belongsTo') {
        return {
          ...base,
          description: base.description ?? `ID of related ${field.relation.resource}`,
          oneOf: [{ type: 'string' }, { type: 'number' }],
        };
      }
      return {
        ...base,
        type: 'array',
        items: { oneOf: [{ type: 'string' }, { type: 'number' }] },
        description: base.description ?? `IDs of related ${field.relation?.resource ?? 'records'}`,
      };
    case 'file':
    case 'image':
      return { ...base, type: 'string', format: 'uri', description: base.description ?? 'URL or path' };
    default:
      return { ...base, type: 'string' };
  }
}

export function resourceWriteSchema(meta: ResourceMeta, mode: 'create' | 'update'): OpenApiSchema {
  const properties: Record<string, OpenApiSchema> = {};
  const required: string[] = [];

  for (const field of meta.fields) {
    if (field.hiddenOnForm) continue;
    if (field.dehydrated === false) continue;
    if (field.readonly === true && mode === 'update') continue;
    properties[field.name] = fieldToSchema(field);
    if (mode === 'create' && isRequired(field)) {
      required.push(field.name);
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length ? required : undefined,
    additionalProperties: true,
  };
}

export function resourceReadSchema(meta: ResourceMeta): OpenApiSchema {
  const properties: Record<string, OpenApiSchema> = {
    id: {
      oneOf: [{ type: 'string' }, { type: 'number' }],
      description: 'Record id',
      readOnly: true,
    },
  };

  for (const field of meta.fields) {
    if (field.hiddenOnDetail && field.hiddenOnTable) continue;
    if (field.type === 'password') continue;
    properties[field.name] = {
      ...fieldToSchema(field),
      writeOnly: undefined,
    };
  }

  return {
    type: 'object',
    properties,
    additionalProperties: true,
  };
}

export function paginatedSchema(itemRef: string): OpenApiSchema {
  return {
    type: 'object',
    required: ['items', 'total', 'page', 'perPage', 'lastPage'],
    properties: {
      items: {
        type: 'array',
        items: { $ref: itemRef },
      },
      total: { type: 'integer', minimum: 0 },
      page: { type: 'integer', minimum: 1 },
      perPage: { type: 'integer', minimum: 1 },
      lastPage: { type: 'integer', minimum: 0 },
    },
  };
}

export function schemaName(slug: string, suffix: string): string {
  const base = slug
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return `${base || 'Resource'}${suffix}`;
}
