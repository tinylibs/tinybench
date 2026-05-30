import { expect, test } from 'vitest'

import { Bench } from '../src'

test('subtractTimerOverhead does not modify samples returned via overriddenDuration', async () => {
  const target = 1
  const bench = new Bench({
    iterations: 32,
    subtractTimerOverhead: true,
    time: 0,
    warmup: false,
  })
  bench.add('override-bench', () => {
    return { overriddenDuration: target }
  })
  await bench.run()

  const task = bench.getTask('override-bench')
  expect(task).toBeDefined()
  if (!task) return
  expect(task.result.state).toBe('completed')
  if (task.result.state !== 'completed') return

  expect(task.result.latency.mean).toBeCloseTo(target, 5)
  expect(task.result.latency.min).toBeCloseTo(target, 5)
  expect(task.result.latency.max).toBeCloseTo(target, 5)
})

test('warning event is not dispatched for fully-overridden constant duration (issue #10)', async () => {
  const bench = new Bench({
    iterations: 32,
    subtractTimerOverhead: true,
    time: 0,
    warmup: false,
  })
  let warningCount = 0
  bench.addEventListener('warning', () => {
    warningCount++
  })
  bench.add('override-bench', () => {
    return { overriddenDuration: 0.05 }
  })
  await bench.run()

  // All 32 samples are overridden → measuredOnly is empty → no saturation
  // detection runs → no warning. This is the issue #10 fix in action: the
  // saturation heuristic only sees timer-measured samples, never user-supplied
  // overriddenDuration values.
  expect(warningCount).toBe(0)
})

test('detectedResolution is not affected by subtractTimerOverhead correction', async () => {
  const benchA = new Bench({
    iterations: 64,
    subtractTimerOverhead: false,
    time: 100,
    warmup: false,
  })
  const benchB = new Bench({
    iterations: 64,
    subtractTimerOverhead: true,
    time: 100,
    warmup: false,
  })

  benchA.add('regex', () => {
    return { overriddenDuration: 0.001 }
  })
  benchB.add('regex', () => {
    return { overriddenDuration: 0.001 }
  })

  await benchA.run()
  await benchB.run()

  const taskA = benchA.getTask('regex')
  const taskB = benchB.getTask('regex')
  expect(taskA?.detectedResolution).toBe(0.001)
  expect(taskB?.detectedResolution).toBe(0.001)
})
