import { expect, test } from 'vitest'

import { Bench } from '../src'
import { asyncSleep } from './utils'

test('iteration limit not exceeded with task concurrency', async () => {
  const bench = new Bench({
    concurrency: 'task',
    iterations: 10,
    threshold: 3,
    time: 10000,
    warmup: false,
  })

  let callCount = 0

  bench.add('task', async () => {
    callCount++
    await asyncSleep(5)
  })

  await bench.run()

  const task = bench.getTask('task')

  expect(task).toBeDefined()
  if (!task) return

  expect(task.result.state).toBe('completed')
  if (task.result.state !== 'completed') return

  expect(callCount).toBe(10)
  expect(task.runs).toBe(10)
  expect(task.result.latency.samplesCount).toBe(10)
})

test('iteration limit not exceeded with high concurrency', async () => {
  const bench = new Bench({
    concurrency: 'task',
    iterations: 100,
    threshold: 10,
    time: 10000,
    warmup: false,
  })

  let callCount = 0

  bench.add('fast-task', async () => {
    callCount++
    await asyncSleep(1)
  })

  await bench.run()

  const task = bench.getTask('fast-task')

  expect(task).toBeDefined()
  if (!task) return

  expect(task.result.state).toBe('completed')
  if (task.result.state !== 'completed') return

  expect(callCount).toBe(100)
  expect(task.runs).toBe(100)
  expect(task.result.latency.samplesCount).toBe(100)
})

test('iteration limit edge case - limit equals threshold', async () => {
  const bench = new Bench({
    concurrency: 'task',
    iterations: 5,
    threshold: 5,
    time: 10000,
    warmup: false,
  })

  let callCount = 0

  bench.add('task', async () => {
    callCount++
    await asyncSleep(10)
  })

  await bench.run()

  const task = bench.getTask('task')

  expect(task).toBeDefined()
  if (!task) return

  expect(task.result.state).toBe('completed')
  if (task.result.state !== 'completed') return

  expect(callCount).toBe(5)
  expect(task.runs).toBe(5)
})

test('iteration limit with very fast tasks', async () => {
  const bench = new Bench({
    concurrency: 'task',
    iterations: 20,
    threshold: 4,
    time: 10000,
    warmup: false,
  })

  const callTimestamps: number[] = []

  // eslint-disable-next-line @typescript-eslint/require-await
  bench.add('instant-task', async () => {
    callTimestamps.push(Date.now())
  })

  await bench.run()

  const task = bench.getTask('instant-task')

  expect(task).toBeDefined()
  if (!task) return

  expect(task.result.state).toBe('completed')
  if (task.result.state !== 'completed') return

  expect(callTimestamps.length).toBe(20)
  expect(task.runs).toBe(20)
})
