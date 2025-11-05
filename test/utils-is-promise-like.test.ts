import { expect, test } from 'vitest'

import { emptyFunction } from '../src/constants'
import {
  isPromiseLike
} from '../src/utils'

test('isPromiseLike', () => {
  expect(isPromiseLike(new Promise(emptyFunction))).toBe(true)
  expect(isPromiseLike(Promise.resolve())).toBe(true)
  expect(isPromiseLike({ then: emptyFunction })).toBe(true)
  expect(isPromiseLike({ then: 'not a function' })).toBe(false)
  expect(isPromiseLike({})).toBe(false)
  expect(isPromiseLike(null)).toBe(false)
  expect(isPromiseLike(undefined)).toBe(false)
  expect(isPromiseLike(123)).toBe(false)
  expect(isPromiseLike('string')).toBe(false)
})
