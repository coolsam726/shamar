import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ActionBuilder } from '../src/index.js'

describe('ActionBuilder url / openIn', () => {
  it('builds modal and download URL actions', () => {
    const list = new ActionBuilder()
    list
      .row('preview_pdf', 'Preview PDF')
      .url('/print/water-bills/{id}/pdf')
      .openInModal()
      .ungrouped()
    list
      .row('download_pdf', 'Download PDF')
      .url('/print/water-bills/{id}/pdf?download=1')
      .openIn('download')
    list
      .row('preview_sms', 'Preview')
      .url('/sms/preview/templates/{id}')
      .openInEmbed()
      .ungrouped()
    const built = list.build()
    assert.equal(built[0]!.url, '/print/water-bills/{id}/pdf')
    assert.equal(built[0]!.openIn, 'modal')
    assert.equal(built[0]!.grouped, false)
    assert.equal(built[1]!.openIn, 'download')
    assert.equal(built[2]!.openIn, 'embed')
  })
})
