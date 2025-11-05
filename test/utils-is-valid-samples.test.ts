import { expect, test } from 'vitest'

import {
  isValidSamples
} from '../src/utils'

test('isValidSamples', () => {
  // @ts-expect-error the argument can be of any type, despite the type definition
  expect(isValidSamples(null)).toBe(false)
  // @ts-expect-error the argument can be of any type, despite the type definition
  expect(isValidSamples(123)).toBe(false)
  // @ts-expect-error the argument can be of any type, despite the type definition
  expect(isValidSamples('string')).toBe(false)
  // @ts-expect-error the argument can be of any type, despite the type definition
  expect(isValidSamples({})).toBe(false)

  expect(isValidSamples(undefined)).toBe(false)
  expect(isValidSamples([])).toBe(false)
  expect(isValidSamples([1])).toBe(true)
})
