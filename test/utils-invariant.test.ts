import { expect, test } from 'vitest'

import { invariant } from '../src/utils'

test('invariant - true', () => {
  expect(() => {
    invariant(true, 'everything fine')
  }).not.toThrow()
})

test('invariant - false', () => {
  expect(() => {
    invariant(false, 'something went wrong')
  }).toThrowError(new Error('something went wrong'))
})
