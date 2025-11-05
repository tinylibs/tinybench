import { expect, test } from 'vitest'

import { Bench } from '../src'

test('events order (sync)', () => {
  const bench = new Bench({
    iterations: 32,
    time: 100,
    warmupIterations: 0,
    warmupTime: 0,
  })
  bench
    .add('foo', () => {
      // noop
    })
    .add('bar', () => {
      // noop
    })
    .add('error', () => {
      throw new Error('fake')
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

  bench.runSync()
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
    'complete',
    'reset',
  ])
}, 10000)
