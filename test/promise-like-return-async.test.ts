import { expect, test } from 'vitest'

import { Bench } from '../src'

test('task with promiseLike return (async)', async () => {
  const bench = new Bench({ iterations: 16, time: 100 })

  bench
    .add('foo', () => ({
      then: (resolve: () => void) => setTimeout(resolve, 50),
    }))
    .add('fum', () => ({
      then: (resolve: () => void) => Promise.resolve(setTimeout(resolve, 50)),
    }))
    .add('bar', () => new Promise(resolve => setTimeout(resolve, 50)))
  await bench.run()

  const fooTask = bench.getTask('foo')
  const fumTask = bench.getTask('fum')
  const barTask = bench.getTask('bar')

  expect(fooTask).toBeDefined()
  if (!fooTask) return

  expect(fumTask).toBeDefined()
  if (!fumTask) return

  expect(barTask).toBeDefined()
  if (!barTask) return

  expect(fooTask.result.state).toBe('completed')
  if (fooTask.result.state !== 'completed') return

  expect(fumTask.result.state).toBe('completed')
  if (fumTask.result.state !== 'completed') return

  expect(barTask.result.state).toBe('completed')
  if (barTask.result.state !== 'completed') return

  expect(fooTask.result.latency.mean).toBeGreaterThan(50)
  expect(fumTask.result.latency.mean).toBeGreaterThan(50)
  expect(barTask.result.latency.mean).toBeGreaterThan(50)
})
