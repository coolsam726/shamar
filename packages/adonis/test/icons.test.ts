import assert from 'node:assert/strict'
import { describe, it, beforeEach, afterEach } from 'node:test'
import { Icons, NavIcons, iconSvg, IconNotFoundError } from '../src/shamar/icons.js'

describe('Icons (blade-icons style)', () => {
  beforeEach(() => {
    Icons.reset()
  })

  afterEach(() => {
    Icons.reset()
  })

  it('resolves full heroicon-o / s / m ids', () => {
    const outline = Icons.svg('heroicon-o-home').toHtml()
    const solid = Icons.svg('heroicon-s-home').toHtml()
    const mini = Icons.svg('heroicon-m-home').toHtml()
    assert.match(outline, /<svg[\s\S]*stroke/)
    assert.match(solid, /<svg[\s\S]*fill="currentColor"/)
    assert.ok(mini.includes('<svg'))
    assert.notEqual(outline, solid)
  })

  it('short names resolve via NavIcons to heroicon-o-*', () => {
    assert.equal(NavIcons.resolve('home'), 'heroicon-o-home')
    assert.equal(NavIcons.resolve('heroicon-s-home'), 'heroicon-s-home')
    assert.equal(NavIcons.resolve(null), NavIcons.DEFAULT)
    assert.equal(NavIcons.defaultForDashboard(true), NavIcons.HOME)
    assert.equal(NavIcons.defaultForDashboard(false), NavIcons.DEFAULT)
  })

  it('iconSvg falls back safely for unknown names', () => {
    const html = iconSvg('definitely-not-a-real-icon-xyz')
    assert.match(html, /<svg/)
    assert.match(html, /aria-hidden="true"/)
  })

  it('usesRegisteredPrefix detects heroicon but not bare names', () => {
    Icons.ensureDefaults()
    assert.equal(Icons.usesRegisteredPrefix('heroicon-o-funnel'), true)
    assert.equal(Icons.usesRegisteredPrefix('home'), false)
  })

  it('throws IconNotFoundError when fallback unset and icon missing', () => {
    Icons.ensureDefaults()
    assert.throws(() => Icons.svg('heroicon-o-no-such-glyph-zzz'), IconNotFoundError)
  })

  it('ships a full Heroicons bundle', () => {
    Icons.ensureDefaults()
    assert.ok(Icons.bundledHeroiconCount() > 900)
  })
})
