import { expect, test } from 'vitest'

import {
  getTimestampProviderByJSRuntime,
  runtime,
} from '../src/utils'

test('autoNowFn - node', () => {
  expect(getTimestampProviderByJSRuntime('node').name).toBe('hrtimeNow')
})

test('autoNowFn - deno', () => {
  expect(getTimestampProviderByJSRuntime('deno').name).toBe('performanceNow')
})

test('autoNowFn - bun', () => {
  if (runtime !== 'bun') {
    expect(getTimestampProviderByJSRuntime('bun')).toBe(undefined)
  } else {
    expect(getTimestampProviderByJSRuntime('bun').name).toBe('bunNanoseconds')
  }
})

test('autoNowFn - unknown runtime defaults to performance.now', () => {
  expect(getTimestampProviderByJSRuntime('unknown').name).toBe('performanceNow')
})
