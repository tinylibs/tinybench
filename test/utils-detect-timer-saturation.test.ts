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
