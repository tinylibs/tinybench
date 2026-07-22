import { expect, test } from 'vitest'

import type { SortedSamples } from '../src/types'

import {
  classifyTimerSaturation,
  detectTimerSaturation,
} from '../src/utils'

const asSorted = (arr: number[]): SortedSamples =>
  arr as unknown as SortedSamples

test('detectTimerSaturation returns false for n below the minimum threshold', () => {
  expect(detectTimerSaturation(asSorted([1]), 0)).toBe(false)
  expect(
    detectTimerSaturation(asSorted([1, 1, 1, 1, 1, 1, 1, 1, 1]), 0)
  ).toBe(false)
})

test('detectTimerSaturation flags more than half zero samples (criterion A)', () => {
  expect(
    detectTimerSaturation(asSorted([0, 0, 0, 0, 0, 0, 1, 2, 3, 4]), 0)
  ).toBe(true)
})

test('detectTimerSaturation does not flag exactly half zero samples', () => {
  expect(
    detectTimerSaturation(asSorted([0, 0, 0, 0, 0, 1, 2, 3, 4, 5]), 1)
  ).toBe(false)
})

test('detectTimerSaturation flags degenerate distinct counts (criterion B)', () => {
  expect(
    detectTimerSaturation(asSorted(new Array<number>(64).fill(1)), 0)
  ).toBe(true)
  const halfHalf = new Array<number>(500)
    .fill(1)
    .concat(new Array<number>(500).fill(2))
  expect(detectTimerSaturation(asSorted(halfHalf), 0.5)).toBe(true)
})

test('detectTimerSaturation flags zero MAD with more than 100 samples (criterion C)', () => {
  const arr: number[] = []
  for (let i = 0; i < 120; i++) arr.push(5)
  for (let i = 0; i < 80; i++) arr.push((i % 10) + 1)
  arr.sort((a, b) => a - b)
  expect(detectTimerSaturation(asSorted(arr), 0)).toBe(true)
})

test('detectTimerSaturation does not flag healthy spread samples', () => {
  const arr: number[] = []
  let seed = 42
  for (let i = 0; i < 500; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0
    arr.push(50 + ((seed >>> 0) / 0xffffffff - 0.5) * 10)
  }
  arr.sort((a, b) => a - b)
  expect(detectTimerSaturation(asSorted(arr), 1.5)).toBe(false)
})

test('classifyTimerSaturation returns undefined for n below the minimum threshold', () => {
  expect(classifyTimerSaturation(asSorted([1]), 0)).toBeUndefined()
  expect(
    classifyTimerSaturation(asSorted([1, 1, 1, 1, 1, 1, 1, 1, 1]), 0)
  ).toBeUndefined()
})

test("classifyTimerSaturation returns 'zero-dominated' for criterion A", () => {
  expect(
    classifyTimerSaturation(asSorted([0, 0, 0, 0, 0, 0, 1, 2, 3, 4]), 0)
  ).toBe('zero-dominated')
})

test("classifyTimerSaturation returns 'low-distinct' for criterion B", () => {
  expect(
    classifyTimerSaturation(asSorted(new Array<number>(64).fill(1)), 0)
  ).toBe('low-distinct')
})

test("classifyTimerSaturation returns 'zero-mad' for criterion C", () => {
  const arr: number[] = []
  for (let i = 0; i < 120; i++) arr.push(5)
  for (let i = 0; i < 80; i++) arr.push((i % 10) + 1)
  arr.sort((a, b) => a - b)
  expect(classifyTimerSaturation(asSorted(arr), 0)).toBe('zero-mad')
})

test('classifyTimerSaturation returns undefined for healthy spread samples', () => {
  const arr: number[] = []
  let seed = 42
  for (let i = 0; i < 500; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0
    arr.push(50 + ((seed >>> 0) / 0xffffffff - 0.5) * 10)
  }
  arr.sort((a, b) => a - b)
  expect(classifyTimerSaturation(asSorted(arr), 1.5)).toBeUndefined()
})

const zeroMadSamples = (medianRepeats: number): number[] => {
  const arr: number[] = new Array<number>(medianRepeats).fill(5)
  for (let i = 0; i < 40; i++) arr.push(100 + i)
  return arr.sort((a, b) => a - b)
}

test("classifyTimerSaturation withholds 'zero-mad' at the n = 100 boundary", () => {
  expect(classifyTimerSaturation(asSorted(zeroMadSamples(60)), 0)).toBeUndefined()
})

test("classifyTimerSaturation fires 'zero-mad' just past the boundary (n = 101)", () => {
  expect(classifyTimerSaturation(asSorted(zeroMadSamples(61)), 0)).toBe('zero-mad')
})

test('classifyTimerSaturation applies the distinct threshold ceiling of 10 at n = 10000', () => {
  const nineDistinct = Array.from({ length: 10000 }, (_, i) => (i % 9) + 1).sort(
    (a, b) => a - b
  )
  expect(classifyTimerSaturation(asSorted(nineDistinct), 1)).toBe('low-distinct')

  const tenDistinct = Array.from({ length: 10000 }, (_, i) => (i % 10) + 1).sort(
    (a, b) => a - b
  )
  expect(classifyTimerSaturation(asSorted(tenDistinct), 1)).toBeUndefined()
})
