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

  const asyncBeforeAllTask = bench.getTask('async-beforeAll')
  expect(asyncBeforeAllTask).toBeDefined()
  if (!asyncBeforeAllTask) return

  expect(asyncBeforeAllTask.result.state).toBe('errored')
  if (asyncBeforeAllTask.result.state !== 'errored') return

  expect(asyncBeforeAllTask.result.error.message).toStrictEqual(
    '`beforeAll` function must be sync when using `runSync()`'
  )

  const asyncBeforeEachTask = bench.getTask('async-beforeEach')
  expect(asyncBeforeEachTask).toBeDefined()
  if (!asyncBeforeEachTask) return

  expect(asyncBeforeEachTask.result.state).toBe('errored')
  if (asyncBeforeEachTask.result.state !== 'errored') return

  expect(asyncBeforeEachTask.result.error.message).toStrictEqual(
    '`beforeEach` function must be sync when using `runSync()`'
  )

  const asyncAfterAllTask = bench.getTask('async-afterAll')
  expect(asyncAfterAllTask).toBeDefined()
  if (!asyncAfterAllTask) return

  expect(asyncAfterAllTask.result.state).toBe('errored')
  if (asyncAfterAllTask.result.state !== 'errored') return

  expect(asyncAfterAllTask.result.error.message).toStrictEqual(
    '`afterAll` function must be sync when using `runSync()`'
  )

  const asyncAfterEachTask = bench.getTask('async-afterEach')
  expect(asyncAfterEachTask).toBeDefined()
  if (!asyncAfterEachTask) return

  expect(asyncAfterEachTask.result.state).toBe('errored')
  if (asyncAfterEachTask.result.state !== 'errored') return

  expect(asyncAfterEachTask.result.error.message).toStrictEqual(
    '`afterEach` function must be sync when using `runSync()`'
  )
})
