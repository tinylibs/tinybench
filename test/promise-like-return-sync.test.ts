import { expect, test } from 'vitest'

import { Bench } from '../src'

test('task with promiseLike return (sync)', () => {
  const bench = new Bench({ iterations: 16, time: 100 })

  bench
    .add('foo', async () => {
      // noop
    })
    .add('fum', () => ({
      then: (resolve: () => void) => Promise.resolve(setTimeout(resolve, 50)),
    }))
    .add('bar', () => new Promise(resolve => setTimeout(resolve, 50)))

  bench.runSync()

  const fooTask = bench.getTask('foo')
  const fumTask = bench.getTask('fum')
  const barTask = bench.getTask('bar')

  expect(fooTask).toBeDefined()
  if (!fooTask) return

  expect(fumTask).toBeDefined()
  if (!fumTask) return

  expect(barTask).toBeDefined()
  if (!barTask) return

  expect(fooTask.result.state).toBe('errored')
  if (fooTask.result.state !== 'errored') return

  expect(fumTask.result.state).toBe('errored')
  if (fumTask.result.state !== 'errored') return

  expect(barTask.result.state).toBe('errored')
  if (barTask.result.state !== 'errored') return

  expect(fooTask.result.error.message).toStrictEqual(
    'task function must be sync when using `runSync()`'
  )
  expect(fumTask.result.error.message).toStrictEqual(
    'task function must be sync when using `runSync()`'
  )
  expect(barTask.result.error.message).toStrictEqual(
    'task function must be sync when using `runSync()`'
  )
})
