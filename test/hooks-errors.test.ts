import { expect, test } from 'vitest'

import { Bench, type FnHook } from '../src'

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

test('throw error when hooks are provided with no functions', () => {
  const bench = new Bench()

  const notAFunction = new Error('Not a function') as unknown as FnHook

  expect(() => {
    bench.add('test', () => 1, {
      beforeAll: notAFunction,
    })
  }).toThrow(new Error("'beforeAll' must be a function if provided"))

  expect(() => {
    bench.add('test', () => 1, {
      beforeEach: notAFunction,
    })
  }).toThrow(new Error("'beforeEach' must be a function if provided"))

  expect(() => {
    bench.add('test', () => 1, {
      afterAll: notAFunction,
    })
  }).toThrow(new Error("'afterAll' must be a function if provided"))

  expect(() => {
    bench.add('test', () => 1, {
      afterEach: notAFunction,
    })
  }).toThrow(new Error("'afterEach' must be a function if provided"))
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

test.each(['warmup', 'run'])(
  'afterAll runs when the %s phase errors (async)',
  async mode => {
    const bench = new Bench({ warmup: mode === 'warmup' })

    const error = new Error('task')
    const BEerror = new Error('BeforeEach')
    const AEerror = new Error('AfterEach')
    const afterAllModes: Record<string, unknown[]> = {
      'AE test': [],
      'BE test': [],
      'fn test': [],
    }

    bench
      .add('fn test', () => Promise.reject(error), {
        afterAll (hookMode) {
          afterAllModes['fn test']?.push(hookMode)
        },
      })
      .add('BE test', async () => Promise.resolve(), {
        afterAll (hookMode) {
          afterAllModes['BE test']?.push(hookMode)
        },
        beforeEach: () => Promise.reject(BEerror),
      })
      .add('AE test', async () => Promise.resolve(), {
        afterAll (hookMode) {
          afterAllModes['AE test']?.push(hookMode)
        },
        afterEach: () => Promise.reject(AEerror),
      })
    await bench.run()

    expect(afterAllModes).toStrictEqual({
      'AE test': [mode],
      'BE test': [mode],
      'fn test': [mode],
    })
    expect(bench.getTask('fn test')?.result).toMatchObject({
      error,
      state: 'errored',
    })
    expect(bench.getTask('BE test')?.result).toMatchObject({
      error: BEerror,
      state: 'errored',
    })
    expect(bench.getTask('AE test')?.result).toMatchObject({
      error: AEerror,
      state: 'errored',
    })
  }
)

test.each(['warmup', 'run'])(
  'afterAll runs when the %s phase errors (sync)',
  mode => {
    const bench = new Bench({ warmup: mode === 'warmup' })

    const error = new Error('task')
    const BEerror = new Error('BeforeEach')
    const AEerror = new Error('AfterEach')
    const afterAllModes: Record<string, unknown[]> = {
      'AE test': [],
      'BE test': [],
      'fn test': [],
    }

    bench
      .add(
        'fn test',
        () => {
          throw error
        },
        {
          afterAll (hookMode) {
            afterAllModes['fn test']?.push(hookMode)
          },
        }
      )
      .add('BE test', () => 1, {
        afterAll (hookMode) {
          afterAllModes['BE test']?.push(hookMode)
        },
        beforeEach: () => {
          throw BEerror
        },
      })
      .add('AE test', () => 1, {
        afterAll (hookMode) {
          afterAllModes['AE test']?.push(hookMode)
        },
        afterEach: () => {
          throw AEerror
        },
      })
    bench.runSync()

    expect(afterAllModes).toStrictEqual({
      'AE test': [mode],
      'BE test': [mode],
      'fn test': [mode],
    })
    expect(bench.getTask('fn test')?.result).toMatchObject({
      error,
      state: 'errored',
    })
    expect(bench.getTask('BE test')?.result).toMatchObject({
      error: BEerror,
      state: 'errored',
    })
    expect(bench.getTask('AE test')?.result).toMatchObject({
      error: AEerror,
      state: 'errored',
    })
  }
)

test('afterAll runs after in-flight iterations when a task-concurrent iteration errors', async () => {
  const bench = new Bench({
    concurrency: 'task',
    iterations: 16,
    threshold: 4,
    warmup: false,
  })

  const error = new Error('task')
  let calls = 0
  let inFlight = 0
  let inFlightAtAfterAll: number | undefined

  bench.add(
    'foo',
    async () => {
      inFlight++
      await new Promise(resolve => setTimeout(resolve, 1))
      inFlight--
      if (++calls === 2) throw error
    },
    {
      afterAll () {
        inFlightAtAfterAll = inFlight
      },
    }
  )
  await bench.run()

  expect(inFlightAtAfterAll).toBe(0)
  expect(bench.getTask('foo')?.result).toMatchObject({
    error,
    state: 'errored',
  })
})

test('afterAll does not run when beforeAll errors', async () => {
  const bench = new Bench({ warmup: false })

  const BAerror = new Error('BeforeAll')
  let afterAllCalls = 0

  bench.add('foo', () => 1, {
    afterAll: () => {
      afterAllCalls++
    },
    beforeAll: () => Promise.reject(BAerror),
  })
  await bench.run()

  expect(afterAllCalls).toBe(0)
  expect(bench.getTask('foo')?.result).toMatchObject({
    error: BAerror,
    state: 'errored',
  })
})

test('an afterAll error replaces the iteration error, as afterEach does', async () => {
  const error = new Error('task')
  const AAerror = new Error('AfterAll')
  const options = {
    afterAll: () => {
      throw AAerror
    },
  }

  const bench = new Bench({ warmup: false })
  bench.add(
    'foo',
    () => {
      throw error
    },
    { ...options, async: false }
  )
  await bench.run()
  expect(bench.getTask('foo')?.result).toMatchObject({
    error: AAerror,
    state: 'errored',
  })

  const syncBench = new Bench({ warmup: false })
  syncBench.add(
    'foo',
    () => {
      throw error
    },
    options
  )
  syncBench.runSync()
  expect(syncBench.getTask('foo')?.result).toMatchObject({
    error: AAerror,
    state: 'errored',
  })
})
