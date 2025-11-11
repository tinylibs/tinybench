import { expect, test } from 'vitest'

import type { HighResolutionTimeStampFns } from '../src/types'

import { Bench, type Task } from '../src'

// If running in CI, allow a bit more leeway for the mean value
const maxMeanValue = process.env.CI ? 1100 : 1002

test.each([['performanceNow'], ['hrtimeNow'], ['auto'], ['bunNanoseconds']] as HighResolutionTimeStampFns[][])('%s basic (async)', async now => {
  const bench = new Bench({
    iterations: 16,
    now,
    time: 100,
  })
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
  expect(tasks[0].result.throughput.mean * tasks[0].result.period).toBeGreaterThan(999)
  expect(
    tasks[0].result.throughput.mean * tasks[0].result.period
  ).toBeLessThan(maxMeanValue)

  expect(tasks[1].name).toEqual('bar')

  expect(tasks[1].result.state).toBe('completed')
  if (tasks[1].result.state !== 'completed') return

  expect(tasks[1].result.totalTime).toBeGreaterThanOrEqual(100)
  expect(Math.ceil(tasks[1].result.latency.mean)).toBeGreaterThanOrEqual(100)
  // throughput mean is ops/s, period is ms unit value
  expect(tasks[1].result.throughput.mean * tasks[1].result.period).toBeGreaterThan(999)
  expect(
    tasks[1].result.throughput.mean * tasks[1].result.period
  ).toBeLessThan(maxMeanValue)
})
