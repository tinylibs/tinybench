import { expect, test } from 'vitest'

import { getStatisticsSorted } from '../src/utils'
import { formatNumber } from '../src/utils'


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
  expect(formatNumber(123456.789, 5, 2)).toBe('123457')
  expect(formatNumber(12345.6789, 5, 2)).toBe('12346')
  expect(formatNumber(1234.56789, 5, 2)).toBe('1234.6')
  expect(formatNumber(123.456789, 5, 2)).toBe('123.46')
  expect(formatNumber(12.3456789, 5, 2)).toBe('12.35')
  expect(formatNumber(-12.3456789, 5, 2)).toBe('-12.35')    
})  

test('median absolute deviation', () => {
  // https://www.wolframalpha.com/input?i=MedianDeviation[1,2,3]
  const stats = getStatisticsSorted([1, 2, 3])
  expect(stats.mad).toBe(1)
})
