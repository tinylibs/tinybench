import { expect, test } from 'vitest'

import {
  autoNowFn,
  runtime,
} from '../src/utils'

test('autoNowFn - node', () => {
  expect(autoNowFn('node').name).toBe('hrtimeNow')
})

test('autoNowFn - deno', () => {
  expect(autoNowFn('deno').name).toBe('bound now')
})

test('autoNowFn - bun', () => {
  if (runtime !== 'bun') {
    expect(autoNowFn('bun')).toBe(undefined)
  } else {
    expect(autoNowFn('bun').name).toBe('bunNanoseconds')
  }
})

test('autoNowFn - unknown runtime defaults to performance.now', () => {
  expect(autoNowFn('unknown').name).toBe('bound now')
})
