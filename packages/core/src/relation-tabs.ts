import { humanizeLabel } from './labels.js'
import type { SchemaNode } from './types.js'

/**
 * Whether a schema leaf is a RelationTable (form field or derived infolist entry).
 */
export function isRelationTableLeaf(node: SchemaNode): boolean {
  if (node.kind === 'field' && node.field) {
    return (
      node.field.type === 'relationTable' || node.field.relation?.widget === 'table'
    )
  }
  if (node.kind === 'entry' && node.entry) {
    return node.entry.type === 'relationTable'
  }
  return false
}

/**
 * A layout node whose only purpose is to host RelationTable content
 * (typical Filament-style `Section.make('Products').schema([RelationTable…])`).
 */
export function isRelationTableContainer(node: SchemaNode): boolean {
  if (node.kind === 'tabs' || node.kind === 'tab' || node.kind === 'wizard' || node.kind === 'step') {
    return false
  }
  if (isRelationTableLeaf(node)) return true

  if (
    node.kind === 'section' ||
    node.kind === 'fieldset' ||
    node.kind === 'plain' ||
    node.kind === 'group'
  ) {
    const children = node.children ?? []
    if (!children.length) return false
    return children.every(
      (child) => isRelationTableLeaf(child) || isRelationTableContainer(child)
    )
  }

  return false
}

function tabTitleFor(node: SchemaNode): string {
  if (node.title?.trim()) return node.title.trim()
  if (node.kind === 'field' && node.field) {
    return String(node.field.label ?? humanizeLabel(node.field.name))
  }
  if (node.kind === 'entry' && node.entry) {
    return String(node.entry.label ?? humanizeLabel(node.entry.name))
  }
  // Prefer the first nested relation leaf name when the container has no title.
  const leaf = (node.children ?? []).find(isRelationTableLeaf)
  if (leaf?.kind === 'field' && leaf.field) {
    return String(leaf.field.label ?? humanizeLabel(leaf.field.name))
  }
  if (leaf?.kind === 'entry' && leaf.entry) {
    return String(leaf.entry.label ?? humanizeLabel(leaf.entry.name))
  }
  return 'Related'
}

function tabChildrenFor(node: SchemaNode): SchemaNode[] {
  if (isRelationTableLeaf(node)) return [node]
  // Unwrap section/fieldset chrome so Tabs don't nest a second card.
  if (
    node.kind === 'section' ||
    node.kind === 'fieldset' ||
    node.kind === 'plain' ||
    node.kind === 'group'
  ) {
    return node.children ?? []
  }
  return [node]
}

/**
 * Collapse consecutive RelationTable sections/fields into a {@link Tabs} layout.
 *
 * Filament-style default: multiple relation managers render as tabs, not stacked cards.
 * Already-tabbed layouts are left alone. Single RelationTables stay as sections.
 */
export function groupRelationTablesIntoTabs(nodes: SchemaNode[]): SchemaNode[] {
  // Recurse first so nested sibling runs are grouped before parent walks.
  const mapped = nodes.map((node) => {
    if (!node.children?.length) return node
    // Do not regroup children of an existing Tabs (author already chose tabs).
    if (node.kind === 'tabs') {
      return {
        ...node,
        children: node.children.map((tab) =>
          tab.children?.length
            ? { ...tab, children: groupRelationTablesIntoTabs(tab.children) }
            : tab
        ),
      }
    }
    return { ...node, children: groupRelationTablesIntoTabs(node.children) }
  })

  const out: SchemaNode[] = []
  let i = 0
  while (i < mapped.length) {
    const node = mapped[i]!
    if (!isRelationTableContainer(node)) {
      out.push(node)
      i += 1
      continue
    }

    const run: SchemaNode[] = []
    while (i < mapped.length && isRelationTableContainer(mapped[i]!)) {
      run.push(mapped[i]!)
      i += 1
    }

    if (run.length === 1) {
      out.push(run[0]!)
      continue
    }

    out.push({
      kind: 'tabs',
      name: '_relation_tabs',
      card: true,
      columnSpan: 'full',
      columns: 1,
      activeTab: 1,
      children: run.map((item, index) => ({
        kind: 'tab' as const,
        name: `relation_tab_${index}`,
        title: tabTitleFor(item),
        description: item.description,
        icon: item.icon,
        columns: 1,
        children: tabChildrenFor(item),
      })),
    })
  }

  return out
}
