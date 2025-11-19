import { describe, expect, it } from 'vitest'

import {
  absoluteDeviationMedian,
  type Samples,
  type SortedSamples,
} from '../src/utils'
import { toSortedSamples } from './utils'

// Helper: calculate median of a sorted array
const medianFn = (samples: SortedSamples): number => {
  const len = samples.length
  const mid = len >> 1
  return len & 1
    ? samples[mid]! // eslint-disable-line @typescript-eslint/no-non-null-assertion
    : (samples[mid - 1]! + samples[mid]!) / 2 // eslint-disable-line @typescript-eslint/no-non-null-assertion
}

// Reference implementation: median of absolute deviations
const absoluteDeviationMedianTrivial = (samples: SortedSamples): number => {
  const median = medianFn(samples)
  const deviations = samples.map(v => Math.abs(v - median)) as Samples
  return medianFn(toSortedSamples(deviations))
}

describe('absoluteDeviationMedian()', () => {
  it('Simple odd length', () => {
    const samples = toSortedSamples([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(absoluteDeviationMedian(samples, medianFn(samples))).toBe(
      absoluteDeviationMedianTrivial(samples)
    )
  })

  it('Simple even length', () => {
    const samples = toSortedSamples([1, 2, 3, 4, 5, 6, 7, 8])
    expect(absoluteDeviationMedian(samples, medianFn(samples))).toBe(
      absoluteDeviationMedianTrivial(samples)
    )
  })

  it('With outliers', () => {
    const samples = toSortedSamples([1, 2, 3, 100, 200])
    expect(absoluteDeviationMedian(samples, medianFn(samples))).toBe(
      absoluteDeviationMedianTrivial(samples)
    )
  })

  it('All same', () => {
    const samples = toSortedSamples([5, 5, 5, 5, 5])
    expect(absoluteDeviationMedian(samples, medianFn(samples))).toBe(
      absoluteDeviationMedianTrivial(samples)
    )
  })

  it('Two elements', () => {
    const samples = toSortedSamples([1, 9])
    expect(absoluteDeviationMedian(samples, medianFn(samples))).toBe(
      absoluteDeviationMedianTrivial(samples)
    )
  })

  it('Single element', () => {
    const samples = toSortedSamples([42])
    expect(absoluteDeviationMedian(samples, medianFn(samples))).toBe(
      absoluteDeviationMedianTrivial(samples)
    )
  })

  it('Symmetric', () => {
    const samples = toSortedSamples([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(absoluteDeviationMedian(samples, medianFn(samples))).toBe(
      absoluteDeviationMedianTrivial(samples)
    )
  })

  it('Large spread', () => {
    const samples = toSortedSamples([
      1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
    ])
    expect(absoluteDeviationMedian(samples, medianFn(samples))).toBe(
      absoluteDeviationMedianTrivial(samples)
    )
  })

  it('Duplicates at start', () => {
    const samples = toSortedSamples([1, 1, 1, 5, 10, 15, 20])
    expect(absoluteDeviationMedian(samples, medianFn(samples))).toBe(
      absoluteDeviationMedianTrivial(samples)
    )
  })

  it('Duplicates at end', () => {
    const samples = toSortedSamples([1, 5, 10, 15, 20, 20, 20])
    expect(absoluteDeviationMedian(samples, medianFn(samples))).toBe(
      absoluteDeviationMedianTrivial(samples)
    )
  })

  it('Duplicates around median', () => {
    const samples = toSortedSamples([1, 2, 5, 5, 5, 8, 9])
    expect(absoluteDeviationMedian(samples, medianFn(samples))).toBe(
      absoluteDeviationMedianTrivial(samples)
    )
  })

  it('Many duplicates', () => {
    const samples = toSortedSamples([1, 2, 2, 3, 3, 3, 4, 4, 5])
    expect(absoluteDeviationMedian(samples, medianFn(samples))).toBe(
      absoluteDeviationMedianTrivial(samples)
    )
  })

  it('Alternating duplicates', () => {
    const samples = toSortedSamples([1, 1, 2, 2, 3, 3, 4, 4, 5, 5])
    expect(absoluteDeviationMedian(samples, medianFn(samples))).toBe(
      absoluteDeviationMedianTrivial(samples)
    )
  })

  it('Almost all same with outlier', () => {
    const samples = toSortedSamples([5, 5, 5, 5, 5, 5, 5, 100])
    expect(absoluteDeviationMedian(samples, medianFn(samples))).toBe(
      absoluteDeviationMedianTrivial(samples)
    )
  })

  it('Two values repeated', () => {
    const samples = toSortedSamples([1, 1, 1, 1, 9, 9, 9, 9])
    expect(absoluteDeviationMedian(samples, medianFn(samples))).toBe(
      absoluteDeviationMedianTrivial(samples)
    )
  })

  it('Complex duplicates', () => {
    const samples = toSortedSamples([1, 1, 2, 3, 3, 3, 4, 5, 5, 6, 6, 6, 6, 7])
    expect(absoluteDeviationMedian(samples, medianFn(samples))).toBe(
      absoluteDeviationMedianTrivial(samples)
    )
  })

  it('fuzzing test', () => {
    const rounds = 1000
    const len = 10

    for (let j = 0; j < rounds; ++j) {
      const samplesArray: Samples = new Array(len) as unknown as Samples
      for (let i = 0; i < len; i++) {
        samplesArray[i] = Math.random() * 10
      }

      const samples = toSortedSamples(samplesArray)
      expect(absoluteDeviationMedian(samples, medianFn(samples))).toBe(
        absoluteDeviationMedianTrivial(samples)
      )
    }
  })
})
