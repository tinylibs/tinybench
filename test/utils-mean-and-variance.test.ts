import { describe, expect, it } from 'vitest'

import { meanAndVariance, Samples } from '../src/utils'

describe('meanAndVariance()', () => {
  it('returns 0 for a single sample', () => {
    expect(meanAndVariance([5]).mean).toBe(5)
    expect(meanAndVariance([5]).vr).toBe(0)
  })

  it('returns 0 for identical samples', () => {
    expect(meanAndVariance([3, 3, 3, 3]).mean).toBe(3)
    expect(meanAndVariance([3, 3, 3, 3]).vr).toBe(0)
  })

  it('computes correct meanAndVariance for small arrays', () => {
    // Reference: meanAndVariance([1, 2, 3]) = 1
    expect(meanAndVariance([1, 2, 3]).vr).toBeCloseTo(1, 10)

    // Reference: meanAndVariance([2, 4, 4, 4, 5, 5, 7, 9]) = 4.57142857
    expect(meanAndVariance([2, 4, 4, 4, 5, 5, 7, 9]).vr).toBeCloseTo(4.57142857, 8)
  })

  it('matches known population vs sample behavior', () => {
    // For sample meanAndVariance, divide by n - 1
    const samples = [1, 2, 3, 4] as Samples
    const avg = 2.5
    const sumSq = samples.reduce((acc, x) => acc + (x - avg) ** 2, 0)
    const expected = sumSq / (samples.length - 1)
    expect(meanAndVariance(samples).vr).toBeCloseTo(expected, 12)
  })

  it('handles negative and mixed numbers', () => {
    expect(meanAndVariance([-1, 0, 1]).vr).toBeCloseTo(1, 10)
    expect(meanAndVariance([-5, -10, 0, 10, 5]).vr).toBeCloseTo(62.5, 10)
  })

  it('handles floating point numbers accurately', () => {
    const samples = [0.1, 0.2, 0.3, 0.4] as Samples
    const avg = 0.25
    const expected = samples.reduce((acc, x) => acc + (x - avg) ** 2, 0) / (samples.length - 1)
    expect(meanAndVariance(samples).vr).toBe(expected)
  })

  it('returns correct meanAndVariance for large uniform arrays', () => {
    const samples = Array(1000).fill(5) as Samples
    expect(meanAndVariance(samples).vr).toBe(0)
  })

  it('returns correct meanAndVariance for large random arrays (approximate)', () => {
    const samples = Array.from({ length: 10000 }, () => Math.random() * 100) as Samples
    const avg = samples.reduce((acc, x) => acc + x, 0) / samples.length
    const manual = samples.reduce((acc, x) => acc + (x - avg) ** 2, 0) / (samples.length - 1)
    expect(meanAndVariance(samples).vr).toBeCloseTo(manual, 10)
  })

  it('handles very large numbers without overflow', () => {
    const samples = [1e12, 1e12 + 1, 1e12 + 2] as Samples
    expect(meanAndVariance(samples).vr).toBe(1)
  })

  it('handles very small numbers (near-zero meanAndVariance)', () => {
    const samples = [1e-12, 1e-12, 1.000001e-12] as Samples
    expect(meanAndVariance(samples).vr).toBeGreaterThanOrEqual(0)
  })

  it('is stable for large arrays of constant numbers', () => {
    const arr = Array(100000).fill(123.456) as Samples
    expect(meanAndVariance(arr).mean).toBe(123.456)
  })
})
