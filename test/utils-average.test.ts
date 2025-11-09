import { describe, expect, it } from 'vitest'

import { average, Samples } from '../src/utils'

describe('average()', () => {
  it('returns the value itself for single-element array', () => {
    expect(average([5])).toBe(5)
    expect(average([-2.5])).toBe(-2.5)
  })

  it('computes correct average for small integer arrays', () => {
    expect(average([1, 2, 3])).toBeCloseTo(2, 12)
    expect(average([2, 4, 6, 8])).toBeCloseTo(5, 12)
  })

  it('computes correct average for negative and mixed numbers', () => {
    expect(average([-1, -2, -3])).toBeCloseTo(-2, 12)
    expect(average([-5, 0, 5])).toBeCloseTo(0, 12)
    expect(average([-10, 10])).toBeCloseTo(0, 12)
  })

  it('handles floating point values accurately', () => {
    const arr = [0.1, 0.2, 0.3, 0.4] as Samples
    const expected = 0.25
    expect(average(arr)).toBeCloseTo(expected, 12)
  })

  it('handles very large numbers without overflow', () => {
    const arr = [1e12, 1e12 + 1, 1e12 + 2] as Samples
    const expected = 1e12 + 1
    expect(average(arr)).toBeCloseTo(expected, 8)
  })

  it('handles very small numbers accurately', () => {
    const arr = [1e-12, 2e-12, 3e-12] as Samples
    expect(average(arr)).toBeCloseTo(2e-12, 20)
  })

  it('returns NaN when array contains only NaN values', () => {
    expect(Number.isNaN(average([NaN, NaN, NaN]))).toBe(true)
  })

  it('ignores negative zero differences (0 and -0 average to 0)', () => {
    const result = average([0, -0, 0])
    expect(Object.is(result, -0)).toBe(false)
    expect(result).toBe(0)
  })

  it('is stable for large arrays of constant numbers', () => {
    const arr = Array(100000).fill(123.456) as Samples
    expect(average(arr)).toBeCloseTo(123.456, 12)
  })

  it('produces similar result as manual sum/len for random data', () => {
    const arr = Array.from({ length: 10000 }, () => Math.random() * 100) as Samples
    const manual = arr.reduce((s, x) => s + x, 0) / arr.length
    expect(average(arr)).toBeCloseTo(manual, 12)
  })
})
