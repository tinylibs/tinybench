import { expect, test } from 'vitest'

import { getStatisticsSorted } from '../src/utils'

test('median absolute deviation', () => {
  // https://www.wolframalpha.com/input?i=MedianDeviation[1,2,3]
  const stats = getStatisticsSorted([1, 2, 3])
  expect(stats.mad).toBe(1)
})
