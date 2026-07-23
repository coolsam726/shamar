import type { ColumnConfig, ResourceMeta } from '@shamar/core';
import {
  getRecordValue,
  humanizeLabel,
  resolveAlignmentClass,
  resolveRelationDisplayBinding,
} from '@shamar/core';
import { badgeValues, cellValue, relatedListLink } from './list-query.js';
import { buildListHeaders, type ListHeader } from './list-headers.js';

export interface RelationTableColumn {
  name: string;
  label: string;
  type?: string;
  format?: string;
  alignment?: string;
  alignmentClass?: string;
  sortable?: boolean;
}

export interface RelationTableCell {
  name: string;
  text: string;
  boolean?: boolean;
  badges?: string[];
  href?: string | null;
}

export interface RelationTableRow {
  id: string;
  label: string;
  cells: RelationTableCell[];
}

/**
 * Columns for an embedded RelationTable — related resource table columns,
 * excluding the parent FK / BelongsTo display column that scopes the relation.
 */
export function relationTableColumns(
  relatedMeta: ResourceMeta,
  foreignKey?: string,
): ColumnConfig[] {
  if (!foreignKey) return relatedMeta.columns;

  return relatedMeta.columns.filter((column) => {
    if (column.name === foreignKey) return false;
    const binding = resolveRelationDisplayBinding(relatedMeta, column.name);
    if (binding?.fieldName === foreignKey) return false;
    return true;
  });
}

export function serializeRelationTableColumns(columns: ColumnConfig[]): RelationTableColumn[] {
  return columns.map((column) => ({
    name: column.name,
    label: column.label ?? humanizeLabel(column.name),
    type: column.type,
    format: column.format,
    alignment: column.alignment,
    alignmentClass: resolveAlignmentClass(column),
    sortable: column.sortable === true,
  }));
}

export function buildRelationTableRows(
  relatedMeta: ResourceMeta,
  columns: ColumnConfig[],
  records: Record<string, unknown>[],
  basePath: string,
  labelFor: (record: Record<string, unknown>) => string,
): RelationTableRow[] {
  return records.map((record) => ({
    id: String(record.id),
    label: labelFor(record),
    cells: columns.map((column) => formatRelationTableCell(relatedMeta, record, column, basePath)),
  }));
}

export function formatRelationTableCell(
  relatedMeta: ResourceMeta,
  record: Record<string, unknown>,
  column: ColumnConfig,
  basePath: string,
): RelationTableCell {
  const isBoolean =
    column.type === 'boolean' ||
    column.format === 'boolean' ||
    column.format === 'toggle';
  const isBadge = column.format === 'badge' || column.type === 'tags';

  return {
    name: column.name,
    text: cellValue(record, column),
    boolean: isBoolean ? !!getRecordValue(record, column.name) : undefined,
    badges: isBadge ? badgeValues(record, column) : undefined,
    href: relatedListLink(relatedMeta, record, column, basePath),
  };
}

export function relationTableListMeta(
  relatedMeta: ResourceMeta,
  foreignKey?: string,
): {
  columns: RelationTableColumn[];
  columnConfigs: ColumnConfig[];
  listHeaders: ListHeader[];
} {
  const columnConfigs = relationTableColumns(relatedMeta, foreignKey);
  const columnNames = new Set(columnConfigs.map((column) => column.name));
  const listHeaders = buildListHeaders(relatedMeta).filter((header) =>
    columnNames.has(header.name),
  );

  return {
    columns: serializeRelationTableColumns(columnConfigs),
    columnConfigs,
    listHeaders,
  };
}
