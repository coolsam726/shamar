import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ResourceMeta } from '@shamar/core'
import { buildMenuSecondary } from '../src/shamar/menu.js'

function meta(partial: Partial<ResourceMeta> & Pick<ResourceMeta, 'slug' | 'label'>): ResourceMeta {
  return {
    singularLabel: partial.label,
    model: 'X',
    recordTitleField: 'name',
    fields: [],
    form: { fields: [], schema: [] },
    columns: [],
    infolist: { entries: [], schema: [] },
    hasExplicitInfolist: false,
    actions: [],
    searchableFields: [],
    ...partial,
  } as ResourceMeta
}

describe('buildMenuSecondary', () => {
  it('keeps ungrouped resources as direct links', () => {
    const items = [
      meta({ slug: 'users', label: 'Users', navigationSort: 1 }),
      meta({ slug: 'roles', label: 'Roles', navigationSort: 2 }),
    ]
    const secondary = buildMenuSecondary(items, '/admin', 'roles')
    assert.equal(secondary.length, 2)
    assert.equal(secondary[0]?.href, '/admin/users')
    assert.equal(secondary[1]?.active, true)
    assert.equal(secondary[1]?.children, undefined)
  })

  it('collapses navigationSubGroup into dropdown children', () => {
    const items = [
      meta({
        slug: 'org-units',
        label: 'Org units',
        navigationSubGroup: 'Organisation',
        navigationSort: 10,
      }),
      meta({
        slug: 'departments',
        label: 'Departments',
        navigationSubGroup: 'Organisation',
        navigationSort: 20,
      }),
      meta({
        slug: 'employees',
        label: 'Employees',
        navigationSubGroup: 'People',
        navigationSort: 30,
      }),
      meta({ slug: 'documents', label: 'Documents', navigationSort: 40 }),
    ]
    const secondary = buildMenuSecondary(items, '/admin', 'departments')
    assert.equal(secondary.length, 3)
    assert.equal(secondary[0]?.label, 'Organisation')
    assert.equal(secondary[0]?.active, true)
    assert.equal(secondary[0]?.children?.length, 2)
    assert.equal(secondary[0]?.children?.[1]?.href, '/admin/departments')
    assert.equal(secondary[1]?.label, 'People')
    assert.equal(secondary[1]?.children?.[0]?.label, 'Employees')
    assert.equal(secondary[2]?.label, 'Documents')
    assert.equal(secondary[2]?.href, '/admin/documents')
  })
})
