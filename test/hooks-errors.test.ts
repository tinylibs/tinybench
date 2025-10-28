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

  expect(bench.getTask('foo')?.result?.error).toStrictEqual(error)
  expect(bench.getTask('bar')?.result?.error).toStrictEqual(promiseError)
  expect(bench.getTask('baz')?.result?.error).toStrictEqual(promiseError)
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

  expect(bench.getTask('foo')?.result?.error).toStrictEqual(error)
  expect(bench.getTask('bar')?.result?.error).toStrictEqual(error)
  expect(bench.getTask('baz')?.result?.error).toStrictEqual(error)
})

test('throw error in beforeAll, afterAll, beforeEach, afterEach (async)', async () => {
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

  expect(bench.getTask('BA test')?.result?.error).toStrictEqual(BAerror)
  expect(bench.getTask('BE test')?.result?.error).toStrictEqual(BEerror)
  expect(bench.getTask('AE test')?.result?.error).toStrictEqual(AEerror)
  expect(bench.getTask('AA test')?.result?.error).toStrictEqual(AAerror)
})

test('throw error in beforeAll, afterAll, beforeEach, afterEach (sync)', () => {
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

  expect(bench.getTask('BA test')?.result?.error).toStrictEqual(BAerror)
  expect(bench.getTask('BE test')?.result?.error).toStrictEqual(BEerror)
  expect(bench.getTask('AE test')?.result?.error).toStrictEqual(AEerror)
  expect(bench.getTask('AA test')?.result?.error).toStrictEqual(AAerror)
})
