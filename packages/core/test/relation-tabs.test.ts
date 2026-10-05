import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  FormBuilder,
  RelationTable,
  Resource,
  Section,
  Tab,
  Tabs,
  TextInput,
  type FormBuilder as FormBuilderType,
  type TableBuilder,
  TextColumn,
} from '../src/index.js'
import {
  groupRelationTablesIntoTabs,
  isRelationTableContainer,
} from '../src/relation-tabs.js'
import type { SchemaNode } from '../src/types.js'

function fieldNode(name: string, type: string = 'relationTable'): SchemaNode {
  return {
    kind: 'field',
    name,
    field: {
      name,
      type: type as never,
      label: name,
      relation: type === 'relationTable' ? { kind: 'hasMany', resource: name, widget: 'table' } : undefined,
    },
  }
}

describe('groupRelationTablesIntoTabs', () => {
  it('leaves a single RelationTable section alone', () => {
    const schema: SchemaNode[] = [
      {
        kind: 'section',
        title: 'Products',
        children: [fieldNode('products')],
      },
    ]
    const next = groupRelationTablesIntoTabs(schema)
    assert.equal(next.length, 1)
    assert.equal(next[0]!.kind, 'section')
    assert.equal(next[0]!.title, 'Products')
  })

  it('groups consecutive RelationTable sections into Tabs', () => {
    const schema: SchemaNode[] = [
      {
        kind: 'section',
        title: 'Identity',
        children: [fieldNode('name', 'text')],
      },
      {
        kind: 'section',
        title: 'Meters',
        description: 'Customer meters',
        children: [fieldNode('meters')],
      },
      {
        kind: 'section',
        title: 'Readings',
        children: [fieldNode('readings')],
      },
      {
        kind: 'section',
        title: 'Invoices',
        children: [fieldNode('invoices')],
      },
    ]

    const next = groupRelationTablesIntoTabs(schema)
    assert.equal(next.length, 2)
    assert.equal(next[0]!.kind, 'section')
    assert.equal(next[0]!.title, 'Identity')
    assert.equal(next[1]!.kind, 'tabs')
    assert.equal(next[1]!.columnSpan, 'full')
    assert.equal(next[1]!.children?.length, 3)
    assert.deepEqual(
      next[1]!.children?.map((t) => t.title),
      ['Meters', 'Readings', 'Invoices']
    )
    assert.equal(next[1]!.children?.[0]!.description, 'Customer meters')
    assert.equal(next[1]!.children?.[0]!.children?.[0]!.field?.name, 'meters')
  })

  it('does not regroup author-defined Tabs', () => {
    const schema: SchemaNode[] = [
      {
        kind: 'tabs',
        children: [
          {
            kind: 'tab',
            title: 'One',
            children: [fieldNode('meters')],
          },
          {
            kind: 'tab',
            title: 'Two',
            children: [fieldNode('readings')],
          },
        ],
      },
    ]
    const next = groupRelationTablesIntoTabs(schema)
    assert.equal(next.length, 1)
    assert.equal(next[0]!.kind, 'tabs')
    assert.deepEqual(
      next[0]!.children?.map((t) => t.title),
      ['One', 'Two']
    )
  })

  it('isRelationTableContainer detects section-wrapped RelationTables', () => {
    assert.equal(
      isRelationTableContainer({
        kind: 'section',
        title: 'Meters',
        children: [fieldNode('meters')],
      }),
      true
    )
    assert.equal(
      isRelationTableContainer({
        kind: 'section',
        title: 'Identity',
        children: [fieldNode('name', 'text')],
      }),
      false
    )
  })
})

describe('Resource relationTablesAsTabs default', () => {
  it('auto-tabs consecutive RelationTable sections on configure()', () => {
    class CustomerResource extends Resource {
      static override slug = 'customers'
      static override label = 'Customers'
      static override singularLabel = 'Customer'
      static override model = 'Customer'

      static override form(form: FormBuilderType) {
        return form.schema([
          Section.make('Customer').schema([TextInput.make('name')]),
          Section.make('Meters').schema([
            RelationTable.make('meters').relationship('meters', 'name', {
              foreignKey: 'partnerId',
            }),
          ]),
          Section.make('Readings').schema([
            RelationTable.make('readings').relationship('readings', 'id', {
              foreignKey: 'partnerId',
            }),
          ]),
        ])
      }

      static override table(table: TableBuilder) {
        return table.schema([TextColumn.make('name')])
      }
    }

    const meta = CustomerResource.configure()
    assert.equal(meta.form.schema[0]!.kind, 'section')
    assert.equal(meta.form.schema[1]!.kind, 'tabs')
    assert.equal(meta.form.schema[1]!.children?.length, 2)
    assert.deepEqual(
      meta.form.schema[1]!.children?.map((t) => t.title),
      ['Meters', 'Readings']
    )
    // Derived infolist keeps the same tab layout.
    assert.equal(meta.infolist.schema[1]!.kind, 'tabs')
  })

  it('can opt out via Resource.relationTablesAsTabs = false', () => {
    class StackedResource extends Resource {
      static override slug = 'stacked'
      static override label = 'Stacked'
      static override singularLabel = 'Stacked'
      static override model = 'Stacked'
      static override relationTablesAsTabs = false

      static override form(form: FormBuilderType) {
        return form.schema([
          Section.make('Meters').schema([
            RelationTable.make('meters').relationship('meters', 'name'),
          ]),
          Section.make('Readings').schema([
            RelationTable.make('readings').relationship('readings', 'id'),
          ]),
        ])
      }

      static override table(table: TableBuilder) {
        return table.schema([TextColumn.make('name')])
      }
    }

    const meta = StackedResource.configure()
    assert.equal(meta.form.schema.length, 2)
    assert.equal(meta.form.schema[0]!.kind, 'section')
    assert.equal(meta.form.schema[1]!.kind, 'section')
  })

  it('respects FormBuilder.relationTablesAsTabs(false)', () => {
    const form = new FormBuilder()
      .relationTablesAsTabs(false)
      .schema([
        Section.make('Meters').schema([
          RelationTable.make('meters').relationship('meters', 'name'),
        ]),
        Section.make('Readings').schema([
          RelationTable.make('readings').relationship('readings', 'id'),
        ]),
      ])
      .build()

    assert.equal(form.schema.length, 2)
    assert.equal(form.schema[0]!.kind, 'section')
  })

  it('does not double-wrap explicit Tabs', () => {
    class ExplicitTabsResource extends Resource {
      static override slug = 'explicit'
      static override label = 'Explicit'
      static override singularLabel = 'Explicit'
      static override model = 'Explicit'

      static override form(form: FormBuilderType) {
        return form.schema([
          Tabs.make()
            .columnSpanFull()
            .tabs([
              Tab.make('Meters').schema([
                RelationTable.make('meters').relationship('meters', 'name'),
              ]),
              Tab.make('Readings').schema([
                RelationTable.make('readings').relationship('readings', 'id'),
              ]),
            ]),
        ])
      }

      static override table(table: TableBuilder) {
        return table.schema([TextColumn.make('name')])
      }
    }

    const meta = ExplicitTabsResource.configure()
    assert.equal(meta.form.schema.length, 1)
    assert.equal(meta.form.schema[0]!.kind, 'tabs')
    assert.deepEqual(
      meta.form.schema[0]!.children?.map((t) => t.title),
      ['Meters', 'Readings']
    )
  })
})
