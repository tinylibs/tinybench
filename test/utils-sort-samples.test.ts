import { expect, test } from 'vitest'

import type { Samples } from '../src/types'

import { sortSamples } from '../src/utils'

test('sorts a small sample in place', () => {
  const samples: Samples = [1, 2, 3, 4, 5, 0]

  sortSamples(samples)

  expect(samples).toEqual([0, 1, 2, 3, 4, 5])
})

test.each(['permuted', 'ascending', 'descending'])(
  'sorts large %s samples of positive and negative fractions',
  order => {
    const length = 8192
    const samples = Array.from({ length }, (_, i) => {
      const index = order === 'permuted'
        ? (i * 4051) % length
        : order === 'descending' ? length - i - 1 : i
      return (index - length / 2) / 16
    }) as Samples

    sortSamples(samples)

    expect(samples).toEqual(
      Array.from({ length }, (_, i) => (i - length / 2) / 16)
    )
  }
)

test('preserves signed zero order among equal large samples', () => {
  const repeated = Array<number>(8192).fill(1)
  const samples: Samples = [0, ...repeated, -0, 0, -0, 0]

  sortSamples(samples)

  expect(samples).toEqual([0, -0, 0, -0, 0, ...repeated])
})

test('sorts large samples containing infinities and extreme finite values', () => {
  const repeated = Array<number>(8192).fill(1)
  const samples: Samples = [
    Number.NEGATIVE_INFINITY,
    ...repeated,
    Number.POSITIVE_INFINITY,
    Number.MAX_VALUE,
    -Number.MAX_VALUE,
    Number.MIN_VALUE,
    -Number.MIN_VALUE,
  ]

  sortSamples(samples)

  expect(samples).toEqual([
    Number.NEGATIVE_INFINITY,
    -Number.MAX_VALUE,
    -Number.MIN_VALUE,
    Number.MIN_VALUE,
    ...repeated,
    Number.MAX_VALUE,
    Number.POSITIVE_INFINITY,
  ])
})
