import { expect, test } from 'vitest'

import { Bench } from '../src'

test.each(['warmup', 'run'])('%s error handling (async)', async mode => {
  const bench = new Bench({ warmup: mode === 'warmup' })

  const error = new Error('error')
  const promiseError = new Error('promise')

  bench
    .add('foo', () => {
      throw error
    })
    .add('bar', async () => Promise.reject(promiseError))
    .add('baz', () => Promise.reject(promiseError))
  await bench.run()

  const fooTask = bench.getTask('foo')
  expect(fooTask).toBeDefined()
  if (!fooTask) return

  expect(fooTask.result.state).toBe('errored')
  if (fooTask.result.state !== 'errored') return
  expect(fooTask.result.error).toStrictEqual(error)

  const barTask = bench.getTask('bar')
  expect(barTask).toBeDefined()
  if (!barTask) return

  expect(barTask.result.state).toBe('errored')
  if (barTask.result.state !== 'errored') return
  expect(barTask.result.error).toStrictEqual(promiseError)

  const bazTask = bench.getTask('baz')
  expect(bazTask).toBeDefined()
  if (!bazTask) return

  expect(bazTask.result.state).toBe('errored')
  if (bazTask.result.state !== 'errored') return
  expect(bazTask.result.error).toStrictEqual(promiseError)
})

test.each(['warmup', 'run'])('%s error handling (sync)', mode => {
  const bench = new Bench({ warmup: mode === 'warmup' })

  const error = new Error('error')

  bench
    .add('foo', () => {
      throw error
    })
    .add('bar', () => {
      throw error
    })
    .add('baz', () => {
      throw error
    })

  bench.runSync()

  const fooTask = bench.getTask('foo')
  expect(fooTask).toBeDefined()
  if (!fooTask) return

  expect(fooTask.result.state).toBe('errored')
  if (fooTask.result.state !== 'errored') return
  expect(fooTask.result.error).toStrictEqual(error)

  const barTask = bench.getTask('bar')
  expect(barTask).toBeDefined()
  if (!barTask) return

  expect(barTask.result.state).toBe('errored')
  if (barTask.result.state !== 'errored') return
  expect(barTask.result.error).toStrictEqual(error)

  const bazTask = bench.getTask('baz')
  expect(bazTask).toBeDefined()
  if (!bazTask) return

  expect(bazTask.result.state).toBe('errored')
  if (bazTask.result.state !== 'errored') return
  expect(bazTask.result.error).toStrictEqual(error)
})

test('hooks error handling (async)', async () => {
  const bench = new Bench()

  const BAerror = new Error('BeforeAll')
  const BEerror = new Error('BeforeEach')
  const AEerror = new Error('AfterEach')
  const AAerror = new Error('AfterAll')

  bench
    .add('BA test', () => 1, {
      beforeAll: () => Promise.reject(BAerror),
    })
    .add('BE test', () => 1, {
      beforeEach: () => Promise.reject(BEerror),
    })
    .add('AE test', () => 1, {
      afterEach: () => Promise.reject(AEerror),
    })
    .add('AA test', () => 1, {
      afterAll: () => Promise.reject(AAerror),
    })
  await bench.run()

  const beforeEachTask = bench.getTask('BE test')
  expect(beforeEachTask).toBeDefined()
  if (!beforeEachTask) return

  expect(beforeEachTask.result.state).toBe('errored')
  if (beforeEachTask.result.state !== 'errored') return
  expect(beforeEachTask.result.error).toStrictEqual(BEerror)

  const beforeAllTask = bench.getTask('BA test')
  expect(beforeAllTask).toBeDefined()
  if (!beforeAllTask) return

  expect(beforeAllTask.result.state).toBe('errored')
  if (beforeAllTask.result.state !== 'errored') return
  expect(beforeAllTask.result.error).toStrictEqual(BAerror)

  const afterEachTask = bench.getTask('AE test')
  expect(afterEachTask).toBeDefined()
  if (!afterEachTask) return

  expect(afterEachTask.result.state).toBe('errored')
  if (afterEachTask.result.state !== 'errored') return
  expect(afterEachTask.result.error).toStrictEqual(AEerror)

  const afterAllTask = bench.getTask('AA test')
  expect(afterAllTask).toBeDefined()
  if (!afterAllTask) return

  expect(afterAllTask.result.state).toBe('errored')
  if (afterAllTask.result.state !== 'errored') return
  expect(afterAllTask.result.error).toStrictEqual(AAerror)
})

test('hooks error handling (sync)', () => {
  const bench = new Bench()

  const BAerror = new Error('BeforeAll')
  const BEerror = new Error('BeforeEach')
  const AEerror = new Error('AfterEach')
  const AAerror = new Error('AfterAll')

  bench
    .add('BA test', () => 1, {
      beforeAll: () => {
        throw BAerror
      },
    })
    .add('BE test', () => 1, {
      beforeEach: () => {
        throw BEerror
      },
    })
    .add('AE test', () => 1, {
      afterEach: () => {
        throw AEerror
      },
    })
    .add('AA test', () => 1, {
      afterAll: () => {
        throw AAerror
      },
    })
  bench.runSync()

  const beforeEachTask = bench.getTask('BE test')
  expect(beforeEachTask).toBeDefined()
  if (!beforeEachTask) return

  expect(beforeEachTask.result.state).toBe('errored')
  if (beforeEachTask.result.state !== 'errored') return
  expect(beforeEachTask.result.error).toStrictEqual(BEerror)

  const beforeAllTask = bench.getTask('BA test')
  expect(beforeAllTask).toBeDefined()
  if (!beforeAllTask) return

  expect(beforeAllTask.result.state).toBe('errored')
  if (beforeAllTask.result.state !== 'errored') return
  expect(beforeAllTask.result.error).toStrictEqual(BAerror)

  const afterEachTask = bench.getTask('AE test')
  expect(afterEachTask).toBeDefined()
  if (!afterEachTask) return

  expect(afterEachTask.result.state).toBe('errored')
  if (afterEachTask.result.state !== 'errored') return
  expect(afterEachTask.result.error).toStrictEqual(AEerror)

  const afterAllTask = bench.getTask('AA test')
  expect(afterAllTask).toBeDefined()
  if (!afterAllTask) return

  expect(afterAllTask.result.state).toBe('errored')
  if (afterAllTask.result.state !== 'errored') return
  expect(afterAllTask.result.error).toStrictEqual(AAerror)
})
