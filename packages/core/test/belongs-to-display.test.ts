import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Select, fieldConfigToEntry } from '../src/index.js'

describe('fieldConfigToEntry belongsTo', () => {
  it('maps partnerId to partner.name for derived infolist', () => {
    const field = Select.make('partnerId')
      .label('Customer')
      .relationship('customers', 'name')
      .build()
    const entry = fieldConfigToEntry(field)
    assert.equal(entry.name, 'partner.name')
    assert.equal(entry.label, 'Customer')
  })

  it('maps billingCycleId to billingCycle.name', () => {
    const field = Select.make('billingCycleId')
      .label('Cycle')
      .relationship('billing-cycles', 'name')
      .build()
    const entry = fieldConfigToEntry(field)
    assert.equal(entry.name, 'billingCycle.name')
  })
})
