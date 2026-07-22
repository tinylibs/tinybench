import { expect, test } from 'vitest'

import type { TimestampProvider } from '../src/types'

import { Bench } from '../src'
import { nToMs } from '../src/utils'

/**
 * Deterministic provider where every back-to-back call pair yields a delta
 * of exactly `stepNs` nanoseconds. Calibration converges on `stepNs / 1e6`
 * ms; every measured raw `taskTime` equals that same overhead, so after
 * `max(0, raw - Ĉ)` correction every measured sample becomes `0`.
 * @param stepNs - the per-call increment in nanoseconds
 * @returns a fresh provider with its own counter
 */
const makeStepProvider = (stepNs: number): TimestampProvider => {
  let counter = 0
  return {
    fn: () => {
      counter += 1
      return counter * stepNs
    },
    fromMs: ms => ms * 1_000_000,
    name: 'det-step',
    toMs: nToMs,
  }
}

test('subtractTimerOverhead aligns overridden samples with measured ones in mixed runs', async () => {
  const iterations = 32
  const K = 100
  const stepNs = 1000
  const stepMs = stepNs / 1_000_000
  const bench = new Bench({
    iterations,
    retainSamples: true,
    subtractTimerOverhead: true,
    time: 0,
    timestampProvider: makeStepProvider(stepNs),
    warmup: false,
  })
  expect(bench.timerOverhead).toBe(stepMs)

  let i = 0
  bench.add('alternating', () => {
    if ((i++ & 1) === 0) return { overriddenDuration: K }
    return undefined
  })
  await bench.run()

  const task = bench.getTask('alternating')
  expect(task).toBeDefined()
  if (!task) return
  expect(task.result.state).toBe('completed')
  if (task.result.state !== 'completed') return

  const samples = task.result.latency.samples
  expect(samples).toBeDefined()
  if (!samples) return
  expect(samples.length).toBe(iterations)
  expect(samples.filter(s => s === K).length).toBe(iterations / 2)
  expect(samples.filter(s => s === 0).length).toBe(iterations / 2)
  expect(samples.every(s => s >= 0)).toBe(true)
  expect(task.result.latency.min).toBe(0)
  expect(task.result.latency.max).toBe(K)
})

test('subtractTimerOverhead alignment holds with the real timer', async () => {
  const iterations = 32
  const K = 0.0000001234567
  const bench = new Bench({
    iterations,
    retainSamples: true,
    subtractTimerOverhead: true,
    time: 0,
    warmup: false,
  })
  let i = 0
  bench.add('alternating', () => {
    if ((i++ & 1) === 0) return { overriddenDuration: K }
    return undefined
  })
  await bench.run()

  const task = bench.getTask('alternating')
  if (task?.result.state !== 'completed') return
  const samples = task.result.latency.samples
  if (!samples) return
  expect(samples.filter(s => s === K).length).toBe(iterations / 2)
  expect(samples.filter(s => s !== K).every(s => s >= 0)).toBe(true)
  expect(samples.filter(s => s !== K).length).toBe(iterations / 2)
})
