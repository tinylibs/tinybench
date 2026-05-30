import { expect, test } from 'vitest'

import { Bench } from '../src'
import {
  calibrateTimerOverhead,
  hrtimeNowTimestampProvider,
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
  const overhead = calibrateTimerOverhead(
    {
      fn: () => 42,
      fromMs: ms => ms,
      name: 'fixed',
      toMs: ts => ts as number,
    },
    256
  )
  expect(overhead).toBe(0)
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
