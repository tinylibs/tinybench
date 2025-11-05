import { expect, test } from 'vitest'

import {
  type Samples,
  sortSamples
} from '../src/utils'

test('sortSamples', () => {
  const samples: Samples = [1, 2, 3, 4, 5, 0]

  expect(sortSamples(samples)).toBe(undefined) // eslint-disable-line
  expect(samples[0]).toBe(0)
  expect(samples[1]).toBe(1)
  expect(samples[2]).toBe(2)
  expect(samples[3]).toBe(3)
  expect(samples[4]).toBe(4)
  expect(samples[5]).toBe(5)
})
