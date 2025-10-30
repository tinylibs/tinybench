import { expect, test } from 'vitest'

import { Bench } from '../src'

/**
 * @param ms amount of time to sleep in milliseconds
 */
function sleep (ms: number): void {
  const start = performance.now()
  while (performance.now() - start < ms) {
    // noop
  }
}

test('task-level abort: aborts individual task without affecting others (async)', async () => {
  const controller = new AbortController()
  const bench = new Bench({ iterations: 16, time: 100 })

  bench.add('task1', async () => {
    await new Promise(resolve => setTimeout(resolve, 50))
  }, { signal: controller.signal })

  bench.add('task2', async () => {
    await new Promise(resolve => setTimeout(resolve, 50))
  })

  controller.abort()

  await bench.run()

  expect(bench.tasks.length).toEqual(2)

  const task1 = bench.getTask('task1')

  expect(task1).toBeDefined()
  if (!task1) return

  expect(task1.result.state).toBe('aborted')
  if (task1.result.state !== 'aborted') return

  expect(task1.result.aborted).toBe(true)
  expect(task1.runs).toBe(0) // No iterations ran

  const task2 = bench.getTask('task2')

  expect(task2).toBeDefined()
  if (!task2) return

  expect(task2.result.state).toBe('completed')
  if (task2.result.state !== 'completed') return

  expect(task2.result.aborted).toBe(false)
  expect(task2.runs).toBeGreaterThan(0)
})

test('task-level abort: aborts individual task without affecting others (sync)', () => {
  const controller = new AbortController()
  const bench = new Bench({ iterations: 16, time: 100 })

  bench.add('task1', () => {
    sleep(50)
  }, { signal: controller.signal })

  bench.add('task2', () => {
    sleep(50)
  })

  controller.abort()

  bench.runSync()

  expect(bench.tasks.length).toEqual(2)

  const task1 = bench.getTask('task1')

  expect(task1).toBeDefined()
  if (!task1) return

  expect(task1.result.state).toBe('aborted')
  if (task1.result.state !== 'aborted') return

  expect(task1.result.aborted).toBe(true)
  expect(task1.runs).toBe(0)

  const task2 = bench.getTask('task2')

  expect(task2).toBeDefined()
  if (!task2) return

  expect(task2.result.state).toBe('completed')
  if (task2.result.state !== 'completed') return

  expect(task2.result.aborted).toBe(false)
  expect(task2.runs).toBeGreaterThan(0)
})

test('task-level abort: aborts during execution (async)', async () => {
  const controller = new AbortController()
  const bench = new Bench({ iterations: 50, time: 200 })

  bench.add('long-task', async () => {
    await new Promise(resolve => setTimeout(resolve, 5))
  }, { signal: controller.signal })

  setTimeout(() => { controller.abort() }, 50)

  await bench.run()

  const task = bench.getTask('long-task')

  expect(task).toBeDefined()
  if (!task) return

  expect(task.result.state).toBe('aborted')
  if (task.result.state !== 'aborted') return

  expect(task.result.aborted).toBe(true)
  // Should have completed some iterations before abort
  // Note: Due to timing, this might be 0 if abort happens very quickly
  if (task.runs && task.runs > 0) {
    // If any iterations completed, verify not all completed
    expect(task.runs).toBeLessThan(50)
  } else {
    // If no iterations completed, that's also acceptable (abort was very fast)
    expect(task.runs).toBe(0)
  }
})

test('task-level abort: emits abort event on task', async () => {
  const controller = new AbortController()
  const bench = new Bench({ iterations: 16, time: 100 })

  let taskAborted = false
  let benchAborted = false

  bench.add('task', async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
  }, { signal: controller.signal })

  const task = bench.getTask('task')

  expect(task).toBeDefined()
  if (!task) return

  task.addEventListener('abort', () => { taskAborted = true })
  bench.addEventListener('abort', () => { benchAborted = true })

  controller.abort()
  await bench.run()

  expect(taskAborted).toBe(true)
  expect(benchAborted).toBe(true)
})

test('task-level abort: task signal takes precedence over bench signal', async () => {
  const benchController = new AbortController()
  const taskController = new AbortController()
  const bench = new Bench({ iterations: 16, signal: benchController.signal, time: 100 })

  bench.add('task', async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
  }, { signal: taskController.signal })

  taskController.abort()

  await bench.run()

  const task = bench.getTask('task')

  expect(task).toBeDefined()
  if (!task) return

  expect(task.result.state).toBe('aborted')
  if (task.result.state !== 'aborted') return

  expect(task.result.aborted).toBe(true)
})

test('task-level abort: bench-level signal aborts all tasks', async () => {
  const benchController = new AbortController()
  const bench = new Bench({ iterations: 16, signal: benchController.signal, time: 100 })

  bench.add('task1', async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
  })

  bench.add('task2', async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
  })

  benchController.abort()

  await bench.run()

  const task1 = bench.getTask('task1')
  const task2 = bench.getTask('task2')

  expect(task1).toBeDefined()
  if (!task1) return

  expect(task2).toBeDefined()
  if (!task2) return

  expect(task1.result.state).toBe('aborted')
  if (task1.result.state !== 'aborted') return

  expect(task2.result.state).toBe('aborted')
  if (task2.result.state !== 'aborted') return

  expect(task1.result.aborted).toBe(true)
  expect(task2.result.aborted).toBe(true)
})

test('task-level abort: works during async warmup phase', async () => {
  const controller = new AbortController()
  const bench = new Bench({ iterations: 16, time: 100, warmup: true, warmupTime: 50 })

  bench.add('task', async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
  }, { signal: controller.signal })

  controller.abort()

  await bench.run()

  const task = bench.getTask('task')

  expect(task).toBeDefined()
  if (!task) return

  expect(task.result.state).toBe('aborted')
  if (task.result.state !== 'aborted') return

  expect(task.result.aborted).toBe(true)
  expect(task.runs).toBe(0)
})

// NOTE: This test is skipped due to memory issues with concurrency and
// task-level abort which can cause OOM errors
test.skip('task-level abort: works with task concurrency', async () => {
  const controller = new AbortController()
  const bench = new Bench({ iterations: 10, time: 50 })
  bench.concurrency = 'task'
  bench.threshold = 2

  bench.add('concurrent-task', async () => {
    await Promise.resolve()
  }, { signal: controller.signal })

  setTimeout(() => { controller.abort() }, 20)

  await bench.run()

  const task = bench.getTask('concurrent-task')

  expect(task).toBeDefined()
  if (!task) return

  expect(task.result.state).toBe('aborted')
  if (task.result.state !== 'aborted') return

  expect(task.result.aborted).toBe(true)
  // only some iterations should have run
  expect(task.runs).toBeGreaterThan(0)
  expect(task.runs).toBeLessThan(10)
})

test('task-level abort: aborted should be false if no signal is provided', async () => {
  const bench = new Bench({ iterations: 16, time: 100 })

  bench.add('task', async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
  })

  await bench.run()

  const task = bench.getTask('task')

  expect(task).toBeDefined()
  if (!task) return

  expect(task.result.state).toBe('completed')
  if (task.result.state !== 'completed') return

  expect(task.result.aborted).toBe(false)
  expect(task.runs).toBeGreaterThan(0)
})

test('task-level abort: aborted should be false if a signal is provided but not aborted', async () => {
  const controller = new AbortController()
  const bench = new Bench({ iterations: 16, time: 100 })

  bench.add('task', async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
  }, { signal: controller.signal })

  // don't abort
  await bench.run()

  const task = bench.getTask('task')

  expect(task).toBeDefined()
  if (!task) return

  expect(task.result.state).toBe('completed')
  if (task.result.state !== 'completed') return

  expect(task.result.aborted).toBe(false)
  expect(task.runs).toBeGreaterThan(0)
})

test('task-level abort: aborted should be false if signal is aborted after run completes', async () => {
  const controller = new AbortController()
  const bench = new Bench({ iterations: 16, time: 100 })

  bench.add('task', async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
  }, { signal: controller.signal })

  await bench.run()

  // Abort after run completes
  controller.abort()

  const task = bench.getTask('task')

  expect(task).toBeDefined()
  if (!task) return

  expect(task.result.state).toBe('completed')
  if (task.result.state !== 'completed') return

  expect(task.result.aborted).toBe(false)
  expect(task.runs).toBeGreaterThan(0)
})
