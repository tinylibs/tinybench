import { expect, test } from 'vitest'

import {
  Samples,
  toSortedSamples
} from '../src/utils'

test('toSortedSamples', () => {
  const samples: Samples = [5, 3, 8, 1, 4]

  expect(toSortedSamples(samples)).toEqual([1, 3, 4, 5, 8])
  expect(samples).not.toBe(toSortedSamples(samples)) // ensure original array is not mutated
})
