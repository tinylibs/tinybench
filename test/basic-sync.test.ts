import { expect, test } from 'vitest'

import { Bench, hrtimeNow, now, Task } from '../src'
import { sleep } from './utils'

// If running in CI, allow a bit more leeway for the mean value
const maxMeanValue = process.env.CI ? 1025 : 1001

test.each([
  ['now()', now],
  ['hrtimeNow()', hrtimeNow],
])('%s basic (sync)', { timeout: 10000 }, (_, _now) => {
  const bench = new Bench({ iterations: 16, now: _now, time: 100 })
  bench
    .add('foo', () => {
      sleep(50)
    })
    .add('bar', () => {
      sleep(100)
    })

  bench.runSync()

  expect(bench.tasks.length).toEqual(2)

  const tasks = bench.tasks as [Task, Task]

  expect(tasks[0].name).toEqual('foo')

  expect(tasks[0].result.state).toBe('completed')
  if (tasks[0].result.state !== 'completed') return

  expect(tasks[0].result.totalTime).toBeGreaterThan(50)
  expect(tasks[0].result.latency.mean).toBeGreaterThan(50)
  // throughput mean is ops/s, period is ms unit value
  expect(
    tasks[0].result.throughput.mean * tasks[0].result.period
  ).above(1000)
  expect(
    tasks[0].result.throughput.mean * tasks[0].result.period
  ).below(maxMeanValue)

  expect(tasks[1].name).toEqual('bar')

  expect(tasks[1].result.state).toBe('completed')
  if (tasks[1].result.state !== 'completed') return

  expect(tasks[1].result.totalTime).toBeGreaterThan(100)
  expect(tasks[1].result.latency.mean).toBeGreaterThan(100)
  // throughput mean is ops/s, period is ms unit value
  expect(
    tasks[1].result.throughput.mean * tasks[1].result.period
  ).above(1000)
  expect(
    tasks[1].result.throughput.mean * tasks[1].result.period
  ).below(maxMeanValue)
})
