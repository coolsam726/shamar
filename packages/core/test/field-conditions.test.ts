import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  Resource,
  TextInput,
  Select,
  form,
  validateFieldConstraints,
  ValidationException,
} from '../src/index.js'

class CondResource extends Resource {
  static override slug = 'conds'
  static override form() {
    return form((f) => {
      f.schema([
        Select.make('kind')
          .options([
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' },
          ])
          .default('a'),
        TextInput.make('extra')
          .visible(({ get }) => get('kind') === 'b')
          .required(({ get }) => get('kind') === 'b'),
      ])
    })
  }
}

describe('reactive field conditions', () => {
  it('builds required/visible/hidden closures on fields', () => {
    const meta = CondResource.configure()
    const extra = meta.fields.find((field) => field.name === 'extra')
    assert.equal(typeof extra?.required, 'function')
    assert.equal(typeof extra?.visible, 'function')

    const hiddenField = TextInput.make('x')
      .hidden(({ get }) => get('kind') === 'a')
      .build()
    assert.equal(typeof hiddenField.visible, 'function')
  })

  it('skips required validation when the field is hidden', () => {
    const meta = CondResource.configure()
    assert.doesNotThrow(() =>
      validateFieldConstraints(meta, { kind: 'a' }, {}),
    )
  })

  it('enforces required when the field is visible', () => {
    const meta = CondResource.configure()
    assert.throws(
      () => validateFieldConstraints(meta, { kind: 'b' }, {}),
      (error: unknown) =>
        error instanceof ValidationException && error.errors.extra != null,
    )
  })
})
