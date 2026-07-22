import type { ColumnConfig, FieldConfig, ListFilter, ResourceMeta } from '@shamar/core'
import { getRecordValue, humanizeLabel } from '@shamar/core'

export type ListHeaderFilterKind = 'boolean' | 'select' | 'm2o'
export type ListHeaderGroupKind = ListHeaderFilterKind

export interface ListHeaderOption {
  label: string
  value: string | boolean | number
  id?: string
}

/** Toolbar filter/group metadata derived from table columns + form fields. */
export interface ListHeader {
  name: string
  label: string
  filter_kind?: ListHeaderFilterKind
  group_kind?: ListHeaderGroupKind
  /** DB / filter field (e.g. companyId for company.name). */
  filterField?: string
  options?: ListHeaderOption[]
}

function isBooleanColumn(column: ColumnConfig): boolean {
  return (
    column.type === 'boolean' ||
    column.format === 'boolean' ||
    column.format === 'toggle'
  )
}

function findFormField(meta: ResourceMeta, columnName: string): FieldConfig | undefined {
  const direct = meta.fields.find((field) => field.name === columnName)
  if (direct) return direct

  if (!columnName.includes('.')) return undefined
  const [relName] = columnName.split('.')
  if (!relName) return undefined

  return meta.fields.find((field) => {
    if (!field.relation || field.relation.kind !== 'belongsTo') return false
    if (field.name === `${relName}Id`) return true
    const resource = field.relation.resource
    // companies → company, users → user
    const singular =
      resource.endsWith('ies')
        ? `${resource.slice(0, -3)}y`
        : resource.endsWith('s')
          ? resource.slice(0, -1)
          : resource
    return singular === relName
  })
}

function selectOptions(field: FieldConfig): ListHeaderOption[] | undefined {
  if (!Array.isArray(field.options) || field.options.length === 0) return undefined
  return field.options.map((opt) => ({
    label: String(opt.label ?? opt.value),
    value: opt.value as string | number | boolean,
  }))
}

/**
 * Build toolbar headers for Filters / Group menus.
 * Boolean columns, matching Select fields, and BelongsTo display columns are included by default.
 */
export function buildListHeaders(meta: ResourceMeta): ListHeader[] {
  const headers: ListHeader[] = []

  for (const column of meta.columns) {
    const label = column.label ?? humanizeLabel(column.name)
    const field = findFormField(meta, column.name)
    const explicitFilter = column.filterable === true
    const explicitGroup = column.groupable === true
    const denyFilter = column.filterable === false
    const denyGroup = column.groupable === false

    let filter_kind: ListHeaderFilterKind | undefined
    let group_kind: ListHeaderGroupKind | undefined
    let filterField = column.name
    let options: ListHeaderOption[] | undefined

    if (isBooleanColumn(column) && !denyFilter) {
      filter_kind = 'boolean'
      if (!denyGroup) group_kind = 'boolean'
    } else if (field?.type === 'select' && field.options?.length && !denyFilter) {
      filter_kind = 'select'
      options = selectOptions(field)
      if (!denyGroup) group_kind = 'select'
    } else if (field?.relation?.kind === 'belongsTo' && !denyFilter) {
      filter_kind = 'm2o'
      filterField = field.name
      if (!denyGroup) group_kind = 'm2o'
    } else if (explicitFilter && field?.type === 'select' && field.options?.length) {
      filter_kind = 'select'
      options = selectOptions(field)
    } else if (explicitFilter && field?.relation?.kind === 'belongsTo') {
      filter_kind = 'm2o'
      filterField = field.name
    }

    if (explicitGroup && !group_kind) {
      if (isBooleanColumn(column)) group_kind = 'boolean'
      else if (field?.type === 'select') group_kind = 'select'
      else if (field?.relation?.kind === 'belongsTo') {
        group_kind = 'm2o'
        filterField = field.name
      } else {
        group_kind = 'select'
      }
    }

    if (!filter_kind && !group_kind && !explicitFilter && !explicitGroup) {
      continue
    }

    if (explicitFilter && !filter_kind && isBooleanColumn(column)) {
      filter_kind = 'boolean'
    }

    if (!filter_kind && !group_kind) continue

    headers.push({
      name: column.name,
      label,
      filter_kind,
      group_kind,
      filterField: filterField !== column.name ? filterField : undefined,
      options,
    })
  }

  return headers
}

export function parseListFilters(raw: unknown): ListFilter[] {
  if (raw == null || raw === '') return []
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(parsed)) return []

  const filters: ListFilter[] = []
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') continue
    const item = entry as Record<string, unknown>
    const field = String(item.field ?? '').trim()
    if (!field) continue
    const op =
      item.op === '!=' || item.op === 'ilike' || item.op === '='
        ? item.op
        : '='
    filters.push({
      field,
      op,
      value: item.value,
      label: item.label != null ? String(item.label) : undefined,
    })
  }
  return filters
}

/** Fill missing chip labels for default / URL filters using list headers. */
export function labelListFilters(
  filters: ListFilter[],
  headers: ListHeader[],
): ListFilter[] {
  return filters.map((filter) => {
    if (filter.label) return { ...filter }
    const header = headers.find(
      (entry) => entry.name === filter.field || entry.filterField === filter.field,
    )
    const labelBase = header?.label ?? filter.field
    let valueLabel = String(filter.value ?? '')
    if (typeof filter.value === 'boolean') {
      valueLabel = filter.value ? 'Yes' : 'No'
    } else if (header?.options?.length) {
      const match = header.options.find(
        (opt) => String(opt.value) === String(filter.value),
      )
      if (match) valueLabel = match.label
    }
    return {
      ...filter,
      label: `${labelBase}: ${valueLabel}`,
    }
  })
}

/**
 * Resolve resource defaultFilters, mapping column names to filter fields when needed.
 */
export function resolveDefaultFilters(
  meta: ResourceMeta,
  headers: ListHeader[],
): ListFilter[] {
  const defaults = meta.defaultFilters ?? []
  if (!defaults.length) return []

  const mapped = defaults.map((filter) => {
    const header = headers.find(
      (entry) => entry.name === filter.field || entry.filterField === filter.field,
    )
    return {
      ...filter,
      field: header?.filterField || filter.field,
    }
  })

  return labelListFilters(mapped, headers)
}

export interface ListGroupSection {
  key: string
  label: string
  items: Record<string, unknown>[]
}

/** Group consecutive records for table rendering (caller should sort by groupBy first). */
export function groupRecordsForDisplay(
  items: Record<string, unknown>[],
  groupBy: string | undefined,
  headers: ListHeader[],
): ListGroupSection[] | null {
  if (!groupBy || !items.length) return null

  const header = headers.find((h) => h.name === groupBy || h.filterField === groupBy)
  const sections: ListGroupSection[] = []

  for (const item of items) {
    const raw = getRecordValue(item, groupBy)
    const key = raw == null || raw === '' ? '__empty__' : String(raw)
    let label: string
    if (raw == null || raw === '') {
      label = 'None'
    } else if (typeof raw === 'boolean') {
      label = raw ? 'Yes' : 'No'
    } else if (header?.options?.length) {
      const match = header.options.find((opt) => String(opt.value) === String(raw))
      label = match ? match.label : String(raw)
    } else {
      label = String(raw)
    }

    const last = sections[sections.length - 1]
    if (last && last.key === key) {
      last.items.push(item)
    } else {
      sections.push({ key, label, items: [item] })
    }
  }

  return sections
}
