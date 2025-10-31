import { randomInt } from 'node:crypto'
import { setTimeout } from 'node:timers/promises'
import { expect, test } from 'vitest'

import { Bench, Task } from '../src'

test.each(['warmup', 'run'])('%s sequential', async mode => {
  const iterations = 1
  const sequentialBench = new Bench({
    iterations,
    throws: true,
    time: 0,
    warmup: mode === 'warmup',
    warmupIterations: iterations,
    warmupTime: 0,
  })

  const benchTasks: string[] = []
  sequentialBench
    .add('sample 1', async () => {
      await setTimeout(randomInt(0, 100))
      benchTasks.push('sample 1')
      if (mode === 'run') {
        expect(benchTasks).toStrictEqual(['sample 1'])
      }
    })
    .add('sample 2', async () => {
      await setTimeout(randomInt(0, 100))
      benchTasks.push('sample 2')
      if (mode === 'run') {
        expect(benchTasks).toStrictEqual(['sample 1', 'sample 2'])
      }
    })
    .add('sample 3', async () => {
      await setTimeout(randomInt(0, 100))
      benchTasks.push('sample 3')
      if (mode === 'run') {
        expect(benchTasks).toStrictEqual(['sample 1', 'sample 2', 'sample 3'])
      }
    })

  const tasks = await sequentialBench.run() as [Task, Task, Task]
  expect(tasks.length).toBe(3)

  if (mode === 'warmup') {
    expect(benchTasks).toStrictEqual([
      'sample 1',
      'sample 2',
      'sample 3',
      'sample 1',
      'sample 2',
      'sample 3',
    ])
  } else if (mode === 'run') {
    expect(benchTasks).toStrictEqual(['sample 1', 'sample 2', 'sample 3'])
  }
  expect(benchTasks.length).toBeGreaterThanOrEqual(tasks.length)

  expect(tasks[0].name).toBe('sample 1')
  expect(tasks[1].name).toBe('sample 2')
  expect(tasks[2].name).toBe('sample 3')
})

test.each(['warmup', 'run'])('%s bench concurrency', async mode => {
  const iterations = 128
  const concurrentBench = new Bench({
    iterations,
    throws: true,
    time: 0,
    warmup: mode === 'warmup',
    warmupIterations: iterations,
    warmupTime: 0,
  })
  expect(concurrentBench.threshold).toBe(Number.POSITIVE_INFINITY)
  expect(concurrentBench.concurrency).toBeNull()
  concurrentBench.concurrency = 'bench'
  expect(concurrentBench.concurrency).toBe('bench')

  let shouldBeDefined1: true | undefined
  let shouldBeDefined2: true | undefined

  let shouldNotBeDefinedFirst1: true | undefined
  let shouldNotBeDefinedFirst2: true | undefined
  concurrentBench
    .add('sample 1', async () => {
      shouldBeDefined1 = true
      await setTimeout(100)
      shouldNotBeDefinedFirst1 = true
    })
    .add('sample 2', async () => {
      shouldBeDefined2 = true
      await setTimeout(100)
      shouldNotBeDefinedFirst2 = true
    })

  // not awaited on purpose
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  concurrentBench.run()

  await setTimeout(0)
  expect(shouldBeDefined1).toBeDefined()
  expect(shouldBeDefined2).toBeDefined()
  expect(shouldNotBeDefinedFirst1).toBeUndefined()
  expect(shouldNotBeDefinedFirst2).toBeUndefined()
  await setTimeout(100)
  expect(shouldNotBeDefinedFirst1).toBeDefined()
  expect(shouldNotBeDefinedFirst2).toBeDefined()
})

test.each(['warmup', 'run'])('%s task concurrency', async mode => {
  const iterations = 16
  const concurrentBench = new Bench({
    iterations,
    throws: true,
    time: 0,
    warmup: mode === 'warmup',
    warmupIterations: iterations,
    warmupTime: 0,
  })
  expect(concurrentBench.threshold).toBe(Number.POSITIVE_INFINITY)
  expect(concurrentBench.concurrency).toBeNull()

  const taskName = 'sample 1'
  let runs = 0

  concurrentBench.add(taskName, async () => {
    runs++
    if (concurrentBench.concurrency === 'task') {
      await setTimeout(10)
      // all task function should be here after 10ms
      expect([iterations, 2 * iterations]).toContain(runs)
    }
  })

  await concurrentBench.run()

  for (const result of concurrentBench.results) {
    expect(result.state).not.toBe('errored')
    if (result.state !== 'errored') break

    expect(result.error).toMatchObject(/AssertionError/)
  }

  const concurrentTask = concurrentBench.getTask(taskName)

  expect(concurrentTask).toBeDefined()
  if (!concurrentTask) return

  expect(concurrentTask.runs).toEqual(iterations)
  expect(runs).toEqual(mode === 'run' ? iterations : 2 * iterations)
  concurrentBench.reset()
  runs = 0
  expect(concurrentBench.threshold).toBe(Number.POSITIVE_INFINITY)
  expect(concurrentBench.concurrency).toBeNull()

  concurrentBench.concurrency = 'task'
  expect(concurrentBench.threshold).toBe(Number.POSITIVE_INFINITY)
  expect(concurrentBench.concurrency).toBe('task')

  await concurrentBench.run()

  for (const result of concurrentBench.results) {
    expect(result.state).not.toBe('errored')
    if (result.state !== 'errored') break

    expect(result.error).toBeUndefined()
  }

  const task = concurrentBench.getTask(taskName)
  expect(task).toBeDefined()
  if (!task) return

  expect(task.runs).toEqual(iterations)
  expect(runs).toEqual(mode === 'run' ? iterations : 2 * iterations)
})
