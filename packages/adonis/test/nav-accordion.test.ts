import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const shamarUiPath = join(here, '../assets/shamar-ui.js')
const navEdgePath = join(here, '../resources/views/shamar/partials/nav.edge')
const navMobilePath = join(here, '../resources/views/shamar/partials/nav-mobile.edge')

describe('SIDE / mobile exclusive nav accordion (Firefly parity)', () => {
  it('shamar-ui.js closes sibling details and re-arms after Wire soft-nav', () => {
    const src = readFileSync(shamarUiPath, 'utf8')
    assert.match(src, /shamarNavAccordion/)
    assert.match(src, /data-shamar-nav-accordion/)
    assert.match(src, /collapseSiblings/)
    assert.match(src, /onSummaryClick/)
    assert.match(src, /data-shamar-nav-accordion-armed/)
    // Wire SPA replaces [data-wire-sync] islands — must re-arm (not livewire-only).
    assert.match(src, /addEventListener\('wire:navigated',\s*scheduleArm\)/)
    assert.match(src, /MutationObserver/)
  })

  it('nav.edge marks SIDE accordion trees; nav-mobile always marks the drawer', () => {
    const side = readFileSync(navEdgePath, 'utf8')
    const mobile = readFileSync(navMobilePath, 'utf8')
    assert.match(side, /sideNavMode === 'accordion'/)
    assert.match(side, /data-shamar-nav-accordion/)
    assert.match(side, /shamar-nav-group-collapsible/)
    assert.match(mobile, /data-shamar-nav-accordion/)
    assert.match(mobile, /shamar-nav-group-collapsible/)
  })
})
