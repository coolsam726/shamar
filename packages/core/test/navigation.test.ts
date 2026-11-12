import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  normalizeNavigationType,
  normalizeSideNavMode,
  panel,
} from '../src/index.js'

describe('navigation types', () => {
  it('normalizes aliases including APP_INVERSE', () => {
    assert.equal(normalizeNavigationType('app'), 'app')
    assert.equal(normalizeNavigationType('INVERSE'), 'inverse')
    assert.equal(normalizeNavigationType('app_inverse'), 'inverse')
    assert.equal(normalizeNavigationType('APP_INVERSE'), 'inverse')
    assert.equal(normalizeNavigationType('SIDE'), 'side')
    assert.equal(normalizeNavigationType('top'), 'top')
    assert.equal(normalizeNavigationType('nope', 'app'), 'app')
  })

  it('normalizes side nav mode', () => {
    assert.equal(normalizeSideNavMode('accordion'), 'accordion')
    assert.equal(normalizeSideNavMode('STATIC'), 'static')
    assert.equal(normalizeSideNavMode(undefined), 'static')
  })

  it('PanelBuilder.navigationType / navigationAccordion set config', () => {
    const config = panel('admin')
      .navigationType('app_inverse')
      .navigationAccordion()
      .build()
    assert.equal(config.navigationType, 'inverse')
    assert.equal(config.sideNavMode, 'accordion')

    const top = panel('admin').topNavigation().build()
    assert.equal(top.navigationType, 'top')

    const side = panel('admin').navigation('side').sideNavMode('static').build()
    assert.equal(side.navigationType, 'side')
    assert.equal(side.sideNavMode, 'static')
  })
})
