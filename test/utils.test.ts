import { expect, test } from 'vitest'

import { getStatisticsSorted } from '../src/utils'

test('median absolute deviation', () => {
  const stats = getStatisticsSorted([1, 2, 3])
  expect(stats.mad).toBe(1)
})
