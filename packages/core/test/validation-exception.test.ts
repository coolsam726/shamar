import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ValidationException, isValidationException } from '../src/index.js'

describe('isValidationException', () => {
  it('recognizes real ValidationException instances', () => {
    const error = new ValidationException({ name: 'Name is required.' })
    assert.equal(isValidationException(error), true)
    assert.equal(error.message, 'Name is required.')
  })

  it('recognizes duck-typed validation errors', () => {
    const error = Object.assign(new Error('User is required.'), {
      name: 'ValidationException',
      errors: { userId: 'User is required.' },
    })
    assert.equal(isValidationException(error), true)
  })

  it('rejects unrelated errors', () => {
    assert.equal(isValidationException(new Error('boom')), false)
    assert.equal(isValidationException({ name: 'ValidationException' }), false)
    assert.equal(isValidationException(null), false)
  })
})
