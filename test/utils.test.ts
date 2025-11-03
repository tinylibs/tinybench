import { expect, test } from 'vitest'

import {
  formatNumber,
  getStatisticsSorted,
  type SortedSamples,
} from '../src/utils'

test('formatting integers', () => {
  expect(formatNumber(123456, 5, 2)).toBe('123456')
  expect(formatNumber(12345, 5, 2)).toBe('12345')
  expect(formatNumber(1234, 5, 2)).toBe('1234.0')
  expect(formatNumber(123, 5, 2)).toBe('123.00')
  expect(formatNumber(12, 5, 2)).toBe('12.00')
  expect(formatNumber(1, 5, 2)).toBe('1.00')
  expect(formatNumber(0, 5, 2)).toBe('0.00')
  expect(formatNumber(-1, 5, 2)).toBe('-1.00')
})

test('formatting floats', () => {
  expect(formatNumber(-Infinity, 5, 2)).toBe('-∞')
  expect(formatNumber(Infinity, 5, 2)).toBe('+∞')
  expect(formatNumber(Number.NaN, 5, 2)).toBe('NaN')
  expect(formatNumber(123456.789, 5, 2)).toBe('123457')
  expect(formatNumber(12345.6789, 5, 2)).toBe('12346')
  expect(formatNumber(1234.56789, 5, 2)).toBe('1234.6')
  expect(formatNumber(123.456789, 5, 2)).toBe('123.46')
  expect(formatNumber(12.3456789, 5, 2)).toBe('12.35')
  expect(formatNumber(-12.3456789, 5, 2)).toBe('-12.35')
})

test('statistics', () => {
  let stats = getStatisticsSorted([
    1, 2, 3, 4, 5, 6,
  ] as unknown as SortedSamples)
  expect(stats.min).toBe(1)
  expect(stats.max).toBe(6)
  expect(stats.df).toBe(5)
  expect(stats.critical).toBeCloseTo(2.571)
  expect(stats.mean).toBe(3.5)
  expect(stats.variance).toBe(3.5)
  expect(stats.sd).toBeCloseTo(1.87)
  expect(stats.sem).toBeCloseTo(0.76)
  expect(stats.moe).toBeCloseTo(1.96)
  expect(stats.rme).toBe((stats.moe / stats.mean) * 100)
  expect(stats.p50).toBe(3.5)
  expect(stats.p75).toBe(4.75)
  expect(stats.p99).toBe(5.95)
  expect(stats.p995).toBe(5.975)
  expect(stats.p999).toBe(5.995)
  expect(stats.mad).toBe(1.5)
  expect(stats.aad).toBe(1.5)
  stats = getStatisticsSorted([1, 2, 3, 4, 5, 6, 7] as unknown as SortedSamples)
  expect(stats.min).toBe(1)
  expect(stats.max).toBe(7)
  expect(stats.df).toBe(6)
  expect(stats.critical).toBeCloseTo(2.447)
  expect(stats.mean).toBe(4)
  expect(stats.variance).toBeCloseTo(4.666)
  expect(stats.sd).toBeCloseTo(2.16)
  expect(stats.sem).toBeCloseTo(0.816)
  expect(stats.moe).toBeCloseTo(1.997)
  expect(stats.rme).toBe((stats.moe / stats.mean) * 100)
  expect(stats.p50).toBe(4)
  expect(stats.p75).toBe(5.5)
  expect(stats.p99).toBeCloseTo(6.939)
  expect(stats.p995).toBe(6.97)
  expect(stats.p999).toBe(6.994)
  expect(stats.mad).toBe(2)
  expect(stats.aad).toBe(1.7142857142857142)
})
