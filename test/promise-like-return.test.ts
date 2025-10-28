import { platform } from 'node:os'
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

  expect(bench.getTask('foo')?.result?.error?.message).toStrictEqual(
    'task function must be sync when using `runSync()`'
  )
  expect(bench.getTask('fum')?.result?.error?.message).toStrictEqual(
    'task function must be sync when using `runSync()`'
  )
  expect(bench.getTask('bar')?.result?.error?.message).toStrictEqual(
    'task function must be sync when using `runSync()`'
  )
})

test(
  'task with promiseLike return (async)',
  { skip: platform() !== 'linux' },
  async () => {
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

    expect(bench.getTask('foo')?.result?.latency.mean).toBeGreaterThan(50)
    expect(bench.getTask('fum')?.result?.latency.mean).toBeGreaterThan(50)
    expect(bench.getTask('bar')?.result?.latency.mean).toBeGreaterThan(50)
  }
)
