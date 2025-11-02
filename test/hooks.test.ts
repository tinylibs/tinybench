import { expect, test } from 'vitest'

import { Bench, type FnHook } from '../src'

test('task beforeAll, afterAll, beforeEach, afterEach (sync)', () => {
  const iterations = 128
  const bench = new Bench({
    iterations,
    time: 0,
    warmupIterations: iterations,
    warmupTime: 0,
  })

  const expectedCallArgumentsAll = ['warmup', 'run']
  const expectedCallArgumentsEach = Array(iterations)
    .fill('warmup')
    .concat(Array(iterations).fill('run'))

  let beforeAllCallCount = 0
  const beforeAll: FnHook = function hook (this, mode) {
    expect(this).toBe(bench.getTask('foo'))
    expect(mode).toBe(expectedCallArgumentsAll[beforeAllCallCount++])
  }

  let afterAllCallCount = 0
  const afterAll: FnHook = function hook (this, mode) {
    expect(this).toBe(bench.getTask('foo'))
    expect(mode).toBe(expectedCallArgumentsAll[afterAllCallCount++])
  }

  let beforeEachCallCount = 0
  const beforeEach: FnHook = function hook (this, mode) {
    expect(this).toBe(bench.getTask('foo'))
    expect(mode).toBe(expectedCallArgumentsEach[beforeEachCallCount++])
  }

  let afterEachCallCount = 0
  const afterEach: FnHook = function hook (this, mode) {
    expect(this).toBe(bench.getTask('foo'))
    expect(mode).toBe(expectedCallArgumentsEach[afterEachCallCount++])
  }

  bench.add(
    'foo',
    () => {
      // noop
    },
    {
      afterAll,
      afterEach,
      beforeAll,
      beforeEach,
    }
  )

  bench.runSync()
})

test('task beforeAll, afterAll, beforeEach, afterEach (async)', async () => {
  const iterations = 128
  const bench = new Bench({
    iterations,
    time: 0,
    warmupIterations: iterations,
    warmupTime: 0,
  })

  const expectedCallArgumentsAll = ['warmup', 'run']
  const expectedCallArgumentsEach = Array(iterations)
    .fill('warmup')
    .concat(Array(iterations).fill('run'))

  let beforeAllCallCount = 0
  const beforeAll: FnHook = function hook (this, mode) {
    expect(this).toBe(bench.getTask('foo'))
    expect(mode).toBe(expectedCallArgumentsAll[beforeAllCallCount++])
  }

  let afterAllCallCount = 0
  const afterAll: FnHook = function hook (this, mode) {
    expect(this).toBe(bench.getTask('foo'))
    expect(mode).toBe(expectedCallArgumentsAll[afterAllCallCount++])
  }

  let beforeEachCallCount = 0
  const beforeEach: FnHook = function hook (this, mode) {
    expect(this).toBe(bench.getTask('foo'))
    expect(mode).toBe(expectedCallArgumentsEach[beforeEachCallCount++])
  }

  let afterEachCallCount = 0
  const afterEach: FnHook = function hook (this, mode) {
    expect(this).toBe(bench.getTask('foo'))
    expect(mode).toBe(expectedCallArgumentsEach[afterEachCallCount++])
  }

  bench.add(
    'foo',
    async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    },
    {
      afterAll,
      afterEach,
      beforeAll,
      beforeEach,
    }
  )

  await bench.run()
})
