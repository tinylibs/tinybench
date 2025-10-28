import { expect, test } from 'vitest'

import { Bench } from '../src'

test('async hooks in sync tests', () => {
  const bench = new Bench({ iterations: 16, time: 100 })

  bench
    .add(
      'async-beforeAll',
      () => {
        // noop
      },
      {
        beforeAll: async () => {
          // noop
        },
      }
    )
    .add(
      'async-beforeEach',
      () => {
        // noop
      },
      {
        beforeEach: async () => {
          // noop
        },
      }
    )
    .add(
      'async-afterAll',
      () => {
        // noop
      },
      {
        afterAll: async () => {
          // noop
        },
      }
    )
    .add(
      'async-afterEach',
      () => {
        // noop
      },
      {
        afterEach: async () => {
          // noop
        },
      }
    )

  bench.runSync()

  expect(
    bench.getTask('async-beforeAll')?.result?.error?.message
  ).toStrictEqual('`beforeAll` function must be sync when using `runSync()`')
  expect(
    bench.getTask('async-beforeEach')?.result?.error?.message
  ).toStrictEqual('`beforeEach` function must be sync when using `runSync()`')
  expect(bench.getTask('async-afterAll')?.result?.error?.message).toStrictEqual(
    '`afterAll` function must be sync when using `runSync()`'
  )
  expect(
    bench.getTask('async-afterEach')?.result?.error?.message
  ).toStrictEqual('`afterEach` function must be sync when using `runSync()`')
})
