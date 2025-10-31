import { expect, test } from 'vitest'

import { Bench, hrtimeNow, now, Task } from '../src'

test.each([
  ['now()', now],
  ['hrtimeNow()', hrtimeNow],
])('%s basic (async)', { timeout: 10000 }, async (_, _now) => {
  const bench = new Bench({ iterations: 16, now: _now, time: 100 })
  bench
    .add('foo', async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })
    .add('bar', async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

  await bench.run()

  expect(bench.tasks.length).toEqual(2)

  const tasks = bench.tasks as [Task, Task]

  expect(tasks[0].name).toEqual('foo')

  expect(tasks[0].result.state).toBe('completed')
  if (tasks[0].result.state !== 'completed') return

  expect(tasks[0].result.totalTime).toBeGreaterThanOrEqual(50)
  expect(Math.ceil(tasks[0].result.latency.mean)).toBeGreaterThanOrEqual(50)
  // throughput mean is ops/s, period is ms unit value
  // throughput mean is ops/s, period is ms unit value
  expect(
    tasks[0].result.throughput.mean * tasks[0].result.period
  ).above(1000)
  expect(
    tasks[0].result.throughput.mean * tasks[0].result.period
  ).below(1001)

  expect(tasks[1].name).toEqual('bar')

  expect(tasks[1].result.state).toBe('completed')
  if (tasks[1].result.state !== 'completed') return

  expect(tasks[1].result.totalTime).toBeGreaterThanOrEqual(100)
  expect(Math.ceil(tasks[1].result.latency.mean)).toBeGreaterThanOrEqual(100)
  // throughput mean is ops/s, period is ms unit value
  expect(
    tasks[1].result.throughput.mean * tasks[1].result.period
  ).above(1000)
  expect(
    tasks[1].result.throughput.mean * tasks[1].result.period
  ).below(1001)
})
