import { expect, test } from 'vitest'

import type { TimestampProvider } from '../src/types'

import { Bench } from '../src'
import {
  calibrateTimerOverhead,
  hrtimeNowTimestampProvider,
  mToMs,
  nToMs,
  performanceNowTimestampProvider,
} from '../src/utils'

/**
 * Deterministic provider: pair `i` returns `(0, i + 1)`, so the i-th
 * collected delta equals `(i + 1)` ns. With `samples = N` the sorted
 * deltas (in ms) are `[1, 2, …, N] × 1e-6`.
 * @returns a fresh provider with its own counter
 */
const makeAscendingPairProvider = (): TimestampProvider => {
  let callCount = 0
  return {
    fn: () => {
      const idx = callCount++
      const pairIdx = idx >> 1
      return (idx & 1) === 1 ? pairIdx + 1 : 0
    },
    fromMs: ms => ms * 1_000_000,
    name: 'asc-pairs',
    toMs: nToMs,
  }
}

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

test('calibrateTimerOverhead estimators are ordered min ≤ p05 ≤ median', () => {
  const min = calibrateTimerOverhead(makeAscendingPairProvider(), {
    estimator: 'min',
    samples: 100,
    warmupSamples: 0,
  })
  const p05 = calibrateTimerOverhead(makeAscendingPairProvider(), {
    estimator: 'p05',
    samples: 100,
    warmupSamples: 0,
  })
  const median = calibrateTimerOverhead(makeAscendingPairProvider(), {
    estimator: 'median',
    samples: 100,
    warmupSamples: 0,
  })
  expect(min).toBe(1e-6)
  expect(p05).toBe(5e-6)
  expect(median).toBe(50.5e-6)
})

test("calibrateTimerOverhead 'p05' selects the index ⌈n·0.05⌉ − 1 delta", () => {
  expect(
    calibrateTimerOverhead(makeAscendingPairProvider(), {
      estimator: 'p05',
      samples: 20,
      warmupSamples: 0,
    })
  ).toBe(1e-6)
  expect(
    calibrateTimerOverhead(makeAscendingPairProvider(), {
      estimator: 'p05',
      samples: 21,
      warmupSamples: 0,
    })
  ).toBe(2e-6)
  expect(
    calibrateTimerOverhead(makeAscendingPairProvider(), {
      estimator: 'p05',
      samples: 200,
      warmupSamples: 0,
    })
  ).toBe(10e-6)
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

test('subtractTimerOverhead with concurrency: "task" throws at construction', () => {
  expect(
    () => new Bench({ concurrency: 'task', subtractTimerOverhead: true })
  ).toThrow(/cannot be used with `concurrency: "task"`/)
})

test('subtractTimerOverhead enforces concurrency invariant at run()', async () => {
  const bench = new Bench({ subtractTimerOverhead: true })
  bench.add('noop', () => {
    // noop
  })
  ;(bench as { concurrency: 'bench' | 'task' | null }).concurrency = 'task'
  await expect(bench.run()).rejects.toThrow(
    /cannot be used with `concurrency: "task"`/
  )
})
