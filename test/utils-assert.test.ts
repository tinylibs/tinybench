import { expect, test } from 'vitest'

import { assert } from '../src/utils'

test('assert - true', () => {
  expect(() => {
    assert(true, 'everything fine')
  }).not.toThrow()
})

test('assert - false', () => {
  expect(() => {
    assert(false, 'something went wrong')
  }).toThrowError(new Error('something went wrong'))
})
