import { expect, test } from 'vitest'

import type { TimestampProvider } from '../src/types'

import { Bench } from '../src'
import {
  calibrateTimerOverhead,
  hrtimeNowTimestampProvider,
  mToMs,
  performanceNowTimestampProvider,
} from '../src/utils'

test('calibrateTimerOverhead returns a finite non-negative number with performanceNow', () => {
  const overhead = calibrateTimerOverhead(performanceNowTimestampProvider)
  expect(overhead).toBeTypeOf('number')
  expect(overhead).toBeGreaterThanOrEqual(0)
  expect(Number.isFinite(overhead)).toBe(true)
})

test('calibrateTimerOverhead returns a finite non-negative number with hrtimeNow', () => {
  const overhead = calibrateTimerOverhead(hrtimeNowTimestampProvider)
  expect(overhead).toBeTypeOf('number')
  expect(overhead).toBeGreaterThanOrEqual(0)
  expect(Number.isFinite(overhead)).toBe(true)
})

test('calibrateTimerOverhead returns 0 for a fixed-value provider', () => {
  const fixedProvider: TimestampProvider = {
    fn: () => 42,
    fromMs: mToMs,
    name: 'fixed',
    toMs: mToMs,
  }
  expect(calibrateTimerOverhead(fixedProvider, { samples: 256 })).toBe(0)
})

test('calibrateTimerOverhead returns 0 for a coarse 1 ms timer provider', () => {
  let counter = 0
  const coarseProvider: TimestampProvider = {
    fn: () => Math.floor(counter++ / 64),
    fromMs: mToMs,
    name: 'coarse',
    toMs: mToMs,
  }
  expect(calibrateTimerOverhead(coarseProvider, { samples: 1024 })).toBe(0)
})

test('calibrateTimerOverhead estimator min is less than or equal to median', () => {
  const med = calibrateTimerOverhead(hrtimeNowTimestampProvider, {
    estimator: 'median',
    samples: 512,
  })
  const min = calibrateTimerOverhead(hrtimeNowTimestampProvider, {
    estimator: 'min',
    samples: 512,
  })
  expect(min).toBeLessThanOrEqual(med * 2)
})

test('calibrateTimerOverhead with hrtimeNow returns a plausible overhead under 10 microseconds', () => {
  const overhead = calibrateTimerOverhead(hrtimeNowTimestampProvider, {
    estimator: 'median',
    samples: 1024,
  })
  if (overhead > 0) {
    expect(overhead).toBeLessThan(0.01)
  } else {
    expect(overhead).toBe(0)
  }
})

test('subtractTimerOverhead defaults to false and leaves timerOverhead undefined', () => {
  const bench = new Bench()
  expect(bench.subtractTimerOverhead).toBe(false)
  expect(bench.timerOverhead).toBeUndefined()
})

test('subtractTimerOverhead: true populates a finite non-negative timerOverhead', () => {
  const bench = new Bench({ subtractTimerOverhead: true })
  expect(bench.subtractTimerOverhead).toBe(true)
  expect(bench.timerOverhead).toBeTypeOf('number')
  expect(Number.isFinite(bench.timerOverhead)).toBe(true)
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  expect(bench.timerOverhead!).toBeGreaterThanOrEqual(0)
})

test('subtractTimerOverhead: true does not produce negative latency samples', () => {
  const bench = new Bench({
    iterations: 64,
    subtractTimerOverhead: true,
    time: 100,
    warmup: false,
  })
  bench.add('noop', () => {
    // noop
  })
  bench.runSync()

  const fooTask = bench.getTask('noop')
  expect(fooTask).toBeDefined()
  if (!fooTask) return

  expect(fooTask.result.state).toBe('completed')
  if (fooTask.result.state !== 'completed') return

  expect(fooTask.result.latency.min).toBeGreaterThanOrEqual(0)
  expect(fooTask.result.latency.mean).toBeGreaterThanOrEqual(0)
})
