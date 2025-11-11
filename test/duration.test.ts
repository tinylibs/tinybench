import { expect, test } from 'vitest'

import { Bench } from '../src'

test('uses overridden task durations (async)', async () => {
  const bench = new Bench({
    iterations: 16,
    now: () => 100,
    throws: true,
  })

  bench.add('foo', async () => {
    return await Promise.resolve({
      overriddenDuration: bench.now() + 50,
    })
  })

  await bench.run()

  const fooTask = bench.getTask('foo')

  expect(fooTask).toBeDefined()
  if (!fooTask) return

  expect(fooTask.result.state).toBe('completed')
  if (fooTask.result.state !== 'completed') return

  expect(fooTask.result.latency.mean).toBe(150)
  expect(fooTask.result.latency.min).toBe(150)
  expect(fooTask.result.latency.max).toBe(150)
})

test('uses overridden task durations (sync)', () => {
  const bench = new Bench({
    iterations: 16,
    now: () => 100,
    throws: true,
  })

  bench.add('foo', () => {
    return {
      overriddenDuration: bench.now() + 50,
    }
  })

  bench.runSync()

  const fooTask = bench.getTask('foo')

  expect(fooTask).toBeDefined()
  if (!fooTask) return

  expect(fooTask.result.state).toBe('completed')
  if (fooTask.result.state !== 'completed') return

  expect(fooTask.result.latency.mean).toBe(150)
  expect(fooTask.result.latency.min).toBe(150)
  expect(fooTask.result.latency.max).toBe(150)
})
