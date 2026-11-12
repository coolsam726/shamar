import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { menuLayoutContext, type NavigationGroup } from '../src/shamar/menu.js'

const groups: NavigationGroup[] = [
  {
    name: 'Attendance',
    icon: 'heroicon-o-academic-cap',
    items: [
      { slug: 'students', label: 'Students', icon: 'academic-cap', navigationSort: 1 },
      {
        slug: 'units',
        label: 'Units',
        icon: 'book-open',
        navigationSort: 2,
        navigationSubGroup: 'Catalog',
      },
      {
        slug: 'lessons',
        label: 'Lessons',
        icon: 'calendar-days',
        navigationSort: 3,
        navigationSubGroup: 'Catalog',
      },
    ],
  },
  {
    name: 'System',
    icon: 'cog',
    items: [{ slug: 'users', label: 'Users', icon: 'users', navigationSort: 1 }],
  },
]

describe('menuLayoutContext navigation types', () => {
  it('APP: L1 roots in sidebar; active children in top bar', () => {
    const menu = menuLayoutContext(groups, '/admin', 'students', 'Students', undefined, {
      navigationType: 'app',
    })
    assert.equal(menu.navigationType, 'app')
    assert.equal(menu.sidebarOffcanvas, false)
    assert.ok(menu.menuRoots.some((r) => r.label === 'Attendance' && r.active))
    assert.ok(menu.menuSecondary.some((i) => i.label === 'Students' && i.active))
  })

  it('INVERSE / APP_INVERSE: same split inverted via chrome (secondary for sidebar)', () => {
    const menu = menuLayoutContext(groups, '/admin', 'users', 'Users', undefined, {
      navigationType: 'app_inverse',
    })
    assert.equal(menu.navigationType, 'inverse')
    assert.ok(menu.menuRoots.some((r) => r.label === 'System' && r.active))
    assert.ok(menu.menuSecondary.some((i) => i.href === '/admin/users'))
  })

  it('SIDE: full tree on roots; no top secondary; accordion mode flag', () => {
    const menu = menuLayoutContext(groups, '/admin', 'units', 'Units', undefined, {
      navigationType: 'side',
      sideNavMode: 'accordion',
    })
    assert.equal(menu.navigationType, 'side')
    assert.equal(menu.sideNavMode, 'accordion')
    assert.equal(menu.menuSecondary.length, 0)
    const attendance = menu.menuRoots.find((r) => r.label === 'Attendance')
    assert.ok(attendance?.children?.length)
    assert.equal(attendance?.active, true)
  })

  it('TOP: full tree on roots; offcanvas sidebar; nested Catalog dropdown', () => {
    const menu = menuLayoutContext(groups, '/admin', 'lessons', 'Lessons', undefined, {
      navigationType: 'top',
    })
    assert.equal(menu.navigationType, 'top')
    assert.equal(menu.sidebarOffcanvas, true)
    assert.equal(menu.menuSecondary.length, 0)
    const attendance = menu.menuRoots.find((r) => r.label === 'Attendance')
    assert.ok(attendance?.children?.some((c) => c.label === 'Catalog' && c.children?.length === 2))
  })

  it('every navigationType keeps a full menuRoots tree for the mobile accordion drawer', () => {
    for (const navigationType of ['app', 'inverse', 'side', 'top', 'sidebar'] as const) {
      const menu = menuLayoutContext(groups, '/admin', 'students', 'Students', undefined, {
        navigationType,
      })
      assert.ok(
        menu.menuRoots.some((r) => r.label === 'Attendance' && (r.children?.length ?? 0) > 0),
        `expected full tree children for ${navigationType}`,
      )
      assert.ok(menu.menuRoots.some((r) => r.label === 'Dashboard'))
    }
  })
})
