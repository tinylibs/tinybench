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

test('events order at task completion (sync)', () => {
  const bench = new Bench({ iterations: 16, time: 100 })

  bench
    .add('foo', () => {
      sleep(25)
    })
    .add('bar', () => {
      sleep(50)
    })

  const events: string[] = []

  const fooTask = bench.getTask('foo')
  const barTask = bench.getTask('bar')
  fooTask?.addEventListener('complete', () => {
    events.push('foo-complete')
    expect(events).toStrictEqual(['foo-complete'])
  })
  barTask?.addEventListener('complete', () => {
    events.push('bar-complete')
    expect(events).toStrictEqual(['foo-complete', 'bar-complete'])
  })

  const tasks = bench.runSync()

  expect(tasks.length).toBe(2)
  expect(tasks[0]?.name).toBe('foo')
  expect(tasks[1]?.name).toBe('bar')
})
