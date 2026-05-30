import { expect, test } from 'vitest'

import type { Samples } from '../src/types'

import { Bench } from '../src'
import { estimateResolution } from '../src/utils'

const asSamples = (arr: number[]): Samples => arr as unknown as Samples

test('estimateResolution returns the smallest reproduced positive value', () => {
  expect(estimateResolution(asSamples([0, 0, 0, 0.001, 1, 1, 1]))).toBe(1)
  expect(estimateResolution(asSamples([0.5, 1, 1, 2, 2]))).toBe(1)
  expect(estimateResolution(asSamples([0.1, 0.1, 0.5, 0.5]))).toBe(0.1)
})

test('estimateResolution falls back to strict min when no value repeats', () => {
  expect(estimateResolution(asSamples([0, 0, 0.5, 1, 2]))).toBe(0.5)
  expect(estimateResolution(asSamples([1, 2, 3]))).toBe(1)
})

test('estimateResolution returns the value itself when all positives are equal', () => {
  expect(estimateResolution(asSamples([1, 1, 1, 1]))).toBe(1)
})

test('estimateResolution returns undefined when all samples are zero or negative', () => {
  expect(estimateResolution(asSamples([0, 0, 0]))).toBeUndefined()
  expect(estimateResolution(asSamples([0]))).toBeUndefined()
  expect(estimateResolution(asSamples([0, -1, -0.5]))).toBeUndefined()
})

test('Task.detectedResolution is undefined before run', () => {
  const bench = new Bench()
  bench.add('foo', () => {
    // noop
  })
  const fooTask = bench.getTask('foo')
  expect(fooTask).toBeDefined()
  if (!fooTask) return
  expect(fooTask.detectedResolution).toBeUndefined()
})

test('Task.detectedResolution is populated after a successful run', () => {
  const bench = new Bench({ iterations: 64, time: 100, warmup: false })
  bench.add('foo', () => {
    // noop
  })
  bench.runSync()
  const fooTask = bench.getTask('foo')
  expect(fooTask).toBeDefined()
  if (!fooTask) return
  expect(fooTask.result.state).toBe('completed')
  if (fooTask.result.state !== 'completed') return

  const resolution = fooTask.detectedResolution
  if (resolution !== undefined) {
    expect(resolution).toBeTypeOf('number')
    expect(resolution).toBeGreaterThan(0)
    expect(Number.isFinite(resolution)).toBe(true)
  }
})

test('Task.detectedResolution is reset to undefined by reset()', () => {
  const bench = new Bench({ iterations: 64, time: 100, warmup: false })
  bench.add('foo', () => {
    // noop
  })
  bench.runSync()
  const fooTask = bench.getTask('foo')
  expect(fooTask).toBeDefined()
  if (!fooTask) return
  fooTask.reset()
  expect(fooTask.detectedResolution).toBeUndefined()
})
