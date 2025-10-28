import { expect, test, vi } from 'vitest'

import { Bench, type Task } from '../src'

test('task beforeAll, afterAll, beforeEach, afterEach (sync)', () => {
  const iterations = 128
  const bench = new Bench({
    iterations,
    time: 0,
    warmupIterations: iterations,
    warmupTime: 0,
  })

  const beforeAll = vi.fn(function hook (this: Task) {
    expect(this).toBe(bench.getTask('foo'))
  })
  const afterAll = vi.fn(function hook (this: Task) {
    expect(this).toBe(bench.getTask('foo'))
  })
  const beforeEach = vi.fn(function hook (this: Task) {
    expect(this).toBe(bench.getTask('foo'))
  })
  const afterEach = vi.fn(function hook (this: Task) {
    expect(this).toBe(bench.getTask('foo'))
  })
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

  expect(beforeAll).toHaveBeenCalledTimes(2 /* warmup + run */)
  expect(beforeAll.mock.calls).toEqual([['warmup'], ['run']])
  expect(afterAll).toHaveBeenCalledTimes(2 /* warmup + run */)
  expect(afterAll.mock.calls).toEqual([['warmup'], ['run']])
  expect(beforeEach).toHaveBeenCalledTimes(iterations * 2 /* warmup + run */)
  expect(beforeEach.mock.calls).toEqual(
    Array(iterations)
      .fill(['warmup'])
      .concat(Array(iterations).fill(['run']))
  )
  expect(afterEach).toHaveBeenCalledTimes(iterations * 2 /* warmup + run */)
  expect(afterEach.mock.calls).toEqual(
    Array(iterations)
      .fill(['warmup'])
      .concat(Array(iterations).fill(['run']))
  )
})

test('task beforeAll, afterAll, beforeEach, afterEach (async)', async () => {
  const iterations = 128
  const bench = new Bench({
    iterations,
    time: 0,
    warmupIterations: iterations,
    warmupTime: 0,
  })

  const beforeAll = vi.fn(function hook (this: Task) {
    expect(this).toBe(bench.getTask('foo'))
  })
  const afterAll = vi.fn(function hook (this: Task) {
    expect(this).toBe(bench.getTask('foo'))
  })
  const beforeEach = vi.fn(function hook (this: Task) {
    expect(this).toBe(bench.getTask('foo'))
  })
  const afterEach = vi.fn(function hook (this: Task) {
    expect(this).toBe(bench.getTask('foo'))
  })
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

  expect(beforeAll).toHaveBeenCalledTimes(2 /* warmup + run */)
  expect(beforeAll.mock.calls).toEqual([['warmup'], ['run']])
  expect(afterAll).toHaveBeenCalledTimes(2 /* warmup + run */)
  expect(afterAll.mock.calls).toEqual([['warmup'], ['run']])
  expect(beforeEach).toHaveBeenCalledTimes(iterations * 2 /* warmup + run */)
  expect(beforeEach.mock.calls).toEqual(
    Array(iterations)
      .fill(['warmup'])
      .concat(Array(iterations).fill(['run']))
  )
  expect(afterEach).toHaveBeenCalledTimes(iterations * 2 /* warmup + run */)
  expect(afterEach.mock.calls).toEqual(
    Array(iterations)
      .fill(['warmup'])
      .concat(Array(iterations).fill(['run']))
  )
})