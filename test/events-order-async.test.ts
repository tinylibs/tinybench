import { expect, test } from 'vitest'

import { Bench } from '../src'

test('events order (async)', async () => {
  const controller = new AbortController()
  const bench = new Bench({
    iterations: 32,
    signal: controller.signal,
    time: 100,
    warmupIterations: 0,
    warmupTime: 0,
  })
  bench
    .add('foo', async () => {
      // noop
    })
    .add('bar', async () => {
      // noop
    })
    .add('error', () => {
      throw new Error('fake')
    })
    .add('abort', async () => {
      await new Promise(resolve => setTimeout(resolve, 1000))
    })

  const events: string[] = []

  const error = bench.getTask('error')

  expect(error).toBeDefined()
  if (!error) return

  error.addEventListener('start', () => {
    events.push('error-start')
  })

  error.addEventListener('error', () => {
    events.push('error-error')
  })

  error.addEventListener('cycle', () => {
    events.push('error-cycle')
  })

  error.addEventListener('complete', () => {
    events.push('error-complete')
  })

  bench.addEventListener('warmup', () => {
    events.push('warmup')
  })

  bench.addEventListener('start', () => {
    events.push('start')
  })

  bench.addEventListener('error', () => {
    events.push('error')
  })

  bench.addEventListener('reset', () => {
    events.push('reset')
  })

  bench.addEventListener('cycle', evt => {
    expect(evt.task).toBeDefined()
    expect(evt.task.name.trim()).not.toBe('')
    events.push('cycle')
  })

  bench.addEventListener('abort', () => {
    events.push('abort')
  })

  bench.addEventListener('add', () => {
    events.push('add')
  })

  bench.addEventListener('remove', () => {
    events.push('remove')
  })

  bench.addEventListener('complete', () => {
    events.push('complete')
  })

  bench
    .add('temporary', () => {
      // noop
    })
    .remove('temporary')

  setTimeout(() => {
    controller.abort()
    // the abort task takes 1000ms (500ms time || 10 iterations => 10 * 1000)
  }, 900)
  await bench.run()
  bench.reset()

  expect(events).toStrictEqual([
    'add',
    'remove',
    'warmup',
    'start',
    'cycle',
    'cycle',
    'error-start',
    'error-error',
    'error',
    'error-cycle',
    'cycle',
    'error-complete',
    'abort',
    'abort',
    'abort',
    'cycle',
    'complete',
    'reset',
  ])

  const abortTask = bench.getTask('abort')

  expect(abortTask).toBeDefined()
  if (!abortTask) return

  // aborted has no results
  const keys = Object.keys(abortTask.result)
  expect(keys.length).toBe(4)
  expect(keys).toContain('state')
  expect(keys).toContain('runtime')
  expect(keys).toContain('runtimeVersion')
  expect(keys).toContain('timestampProviderName')
}, 10000)
