import type { Samples, SortedSamples, Statistics } from './types'

import { tTable } from './constants'

/**
 * Checks if a value is a Samples type.
 * @param value - value to check
 * @returns if the value is a Samples type, meaning a non-empty array of numbers
 */
export const isValidSamples = (
  value: number[] | undefined
): value is Samples => {
  return Array.isArray(value) && value.length !== 0
}

/**
 * Sorts samples in place.
 * @param samples - samples to sort
 */
export function sortSamples (
  samples: Samples
): asserts samples is SortedSamples {
  samples.sort(sortFn)
}

/**
 * Computes the mean and variance of a sample.
 * @param samples - the sample
 * @returns an object containing the mean and variance
 */
export const meanAndVariance = (
  samples: Samples
): { mean: number; vr: number } => {
  const len = samples.length
  if (len === 1) {
    return { mean: samples[0], vr: 0 }
  }

  let mean = 0
  let m = 0
  let x = 0
  let d = 0
  let i = 0

  while (i < len) {
    x = samples[i++]! // eslint-disable-line @typescript-eslint/no-non-null-assertion
    d = x - mean
    mean += d / i
    m += d * (x - mean)
  }

  return {
    mean,
    vr: m / (len - 1),
  }
}

/**
 * Computes the q-quantile of a sorted sample.
 * @param samples - the sorted sample
 * @param q - the quantile to compute
 * @returns the q-quantile of the sample
 */
export const quantileSorted = (
  samples: SortedSamples,
  q: 0.05 | 0.5 | 0.75 | 0.99 | 0.995 | 0.999
): number => {
  const base = (samples.length - 1) * q
  const baseIndex = Math.floor(base)
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const lower = samples[baseIndex]!
  if (baseIndex + 1 >= samples.length) {
    return lower
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const upper = samples[baseIndex + 1]!
  return lower + (base - baseIndex) * (upper - lower)
}

/**
 * A sort function to be passed to Array.prototype.sort for numbers.
 * @param a - first number
 * @param b - second number
 * @returns a number indicating the sort order
 */
export const sortFn = (a: number, b: number) => a - b

/**
 * Computes the average absolute deviation from the mean.
 * @param samples - the sample
 * @param mean - the mean of the sample
 * @returns the average absolute deviation
 */
export const absoluteDeviationMean = (
  samples: Samples,
  mean: number
): number => {
  let result = 0
  const len = samples.length

  let i = 0

  while (i < len) {
    result += (Math.abs(samples[i++]! - mean) - result) / i // eslint-disable-line @typescript-eslint/no-non-null-assertion
  }

  return result
}

/**
 * Computes the median absolute deviation from the median.
 * @param samples - the sorted sample
 * @param median - the median of the sample
 * @returns the median absolute deviation
 */
export function absoluteDeviationMedian (
  samples: SortedSamples,
  median: number
): number {
  const len = samples.length
  if (len === 1) return 0

  const mid = len >> 1
  const halfLen = (len + 1) >> 1

  let low = 0
  let high = mid
  let c1, c2, l1, l2, r1, r2

  while (low <= high) {
    c1 = (low + high) >> 1
    c2 = halfLen - c1

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    l1 = c1 === 0 ? Number.NEGATIVE_INFINITY : median - samples[mid - c1]!

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    r1 = c1 === mid ? Number.POSITIVE_INFINITY : median - samples[mid - c1 - 1]!

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    l2 = c2 === 0 ? Number.NEGATIVE_INFINITY : samples[mid + c2 - 1]! - median

    r2 =
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      c2 === len - mid ? Number.POSITIVE_INFINITY : samples[mid + c2]! - median

    if (l1 <= r2 && l2 <= r1) {
      return len & 1 // check for odd length
        ? Math.max(l1, l2)
        : (Math.max(l1, l2) + Math.min(r1, r2)) / 2
    }

    if (l1 > r2) {
      high = c1 - 1
    } else {
      low = c1 + 1
    }
  }
  return 0 // should never reach here
}

/**
 * Computes the median absolute deviation (MAD) of a sorted sample set.
 *
 * Convenience wrapper that derives the median from the sorted input and
 * forwards to `absoluteDeviationMedian`. Use when only `mad` is
 * required and the cost of a full `computeStatistics` pass is
 * unjustified (e.g. inside `classifyTimerSaturation`).
 * @param samples - the sorted sample, length ≥ 1
 * @returns the median absolute deviation
 */
export const medianAbsoluteDeviation = (samples: SortedSamples): number =>
  absoluteDeviationMedian(samples, quantileSorted(samples, 0.5))

/**
 * Computes the statistics of a sample.
 * The sample must be sorted.
 * @param samples - the sorted sample
 * @param retainSamples - whether to keep the samples in the statistics
 * @returns the statistics of the sample
 */
export function computeStatistics (
  samples: SortedSamples,
  retainSamples = false
): Statistics {
  const { mean, vr } = meanAndVariance(samples)
  const sd = Math.sqrt(vr)
  const sem = sd / Math.sqrt(samples.length)
  const df = samples.length - 1
  const critical = tTable[df || 1] ?? tTable[0]
  const moe = sem * critical
  const rme =
    mean === 0 ? Number.POSITIVE_INFINITY : (moe / Math.abs(mean)) * 100
  const p50 = quantileSorted(samples, 0.5)

  return {
    aad: absoluteDeviationMean(samples, mean),
    critical,
    df,
    mad: absoluteDeviationMedian(samples, p50),
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    max: samples[df]!,
    mean,
    min: samples[0],
    moe,
    p50,
    p75: quantileSorted(samples, 0.75),
    p99: quantileSorted(samples, 0.99),
    p995: quantileSorted(samples, 0.995),
    p999: quantileSorted(samples, 0.999),
    rme,
    samples: retainSamples ? samples : undefined,
    samplesCount: samples.length,
    sd,
    sem,
    variance: vr,
  }
}
