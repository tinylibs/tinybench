import { expect, test } from 'vitest'

import type { TimerSaturationReason, TimestampProvider } from '../src/types'

import { Bench } from '../src'
import { mToMs } from '../src/utils'

const fixedZeroProvider: TimestampProvider = {
  fn: () => 0,
  fromMs: mToMs,
  name: 'fixed-zero',
  toMs: mToMs,
}

test("warning event carries reason 'zero-dominated' for a constant-zero timer", async () => {
  const bench = new Bench({
    iterations: 64,
    time: 0,
    timestampProvider: fixedZeroProvider,
    warmup: false,
  })
  let received: TimerSaturationReason | undefined
  bench.addEventListener('warning', evt => {
    received = evt.reason
  })
  bench.add('zero-task', () => {
    // noop
  })
  await bench.run()
  expect(received).toBe('zero-dominated')
})

test('non-warning events expose reason as undefined', async () => {
  const bench = new Bench({ iterations: 8, time: 0, warmup: false })
  let cycleReason: unknown = 'untouched'
  bench.addEventListener('cycle', evt => {
    cycleReason = evt.reason
  })
  bench.add('noop', () => {
    // noop
  })
  await bench.run()
  expect(cycleReason).toBeUndefined()
})
