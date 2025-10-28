import { expect, test } from 'vitest'

import { Bench } from '../src'

test('events order at task completion (async)', async () => {
  const bench = new Bench({ iterations: 16, time: 100 })

  bench
    .add('foo', async () => {
      await new Promise(resolve => setTimeout(resolve, 25))
    })
    .add('bar', async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
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

  const tasks = await bench.run()

  expect(tasks.length).toBe(2)
  expect(tasks[0]?.name).toBe('foo')
  expect(tasks[1]?.name).toBe('bar')
})
