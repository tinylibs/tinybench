import { platform } from 'node:os'
import { expect, test, vi } from 'vitest'

import { Bench, hrtimeNow, now, type Task } from '../src'

test.each([
  ['now()', now],
  ['hrtimeNow()', hrtimeNow],
])('%s basic', { skip: platform() !== 'linux' }, async (_, _now) => {
  const bench = new Bench({ iterations: 16, now: _now, time: 100 })
  bench
    .add('foo', async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })
    .add('bar', async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

  await bench.run()

  const { tasks } = bench

  expect(tasks.length).toEqual(2)

  expect(tasks[0]?.name).toEqual('foo')
  expect(tasks[0]?.result?.totalTime).toBeGreaterThan(50)
  expect(tasks[0]?.result?.latency.mean).toBeGreaterThan(50)
  // throughput mean is ops/s, period is ms unit value
  expect(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    tasks[0]!.result!.throughput.mean * tasks[0]!.result!.period
  ).toBeCloseTo(1000, 1)

  expect(tasks[1]?.name).toEqual('bar')
  expect(tasks[1]?.result?.totalTime).toBeGreaterThan(100)
  expect(tasks[1]?.result?.latency.mean).toBeGreaterThan(100)
  // throughput mean is ops/s, period is ms unit value
  expect(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    tasks[1]!.result!.throughput.mean * tasks[1]!.result!.period
  ).toBeCloseTo(1000, 1)
})

test('cannot add duplicate task', () => {
  const bench = new Bench()
  bench.add('foo', () => {
    /* noop */
  })
  expect(() =>
    bench.add('foo', () => {
      /* noop */
    })
  ).toThrowError('Task "foo" already exists')
})

test('bench table', async () => {
  const bench = new Bench({ iterations: 32, time: 100 })
  bench.add('foo', async () => {
    await new Promise(resolve => setTimeout(resolve, 1))
  })

  await bench.run()

  expect(bench.table()).toStrictEqual([
    /* eslint-disable perfectionist/sort-objects */
    {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      'Task name': expect.any(String),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      'Latency average (ns)': expect.any(String),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      'Latency median (ns)': expect.any(String),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      'Throughput average (ops/s)': expect.any(String),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      'Throughput median (ops/s)': expect.any(String),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      Samples: expect.any(Number),
    },
    /* eslint-enable perfectionist/sort-objects */
  ])

  bench.remove('foo').add('bar', () => {
    throw new Error('fake')
  })

  await bench.run()

  expect(bench.table()).toStrictEqual([
    /* eslint-disable perfectionist/sort-objects */
    {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      'Task name': expect.any(String),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      Error: expect.any(String),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      Stack: expect.any(String),
    },
    /* eslint-enable perfectionist/sort-objects */
  ])
})

test('bench task runs and time consistency', async () => {
  const bench = new Bench({ iterations: 32, time: 100 })
  bench.add('foo', async () => {
    await new Promise(resolve => setTimeout(resolve, 50))
  })

  await bench.run()

  const fooTask = bench.getTask('foo')

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  expect(fooTask?.runs).toBeGreaterThanOrEqual(bench.opts.iterations!)
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  expect(fooTask?.result?.totalTime).toBeGreaterThanOrEqual(bench.opts.time!)
})

test('events order', async () => {
  const controller = new AbortController()
  const bench = new Bench({
    iterations: 32,
    signal: controller.signal,
    time: 100,
    warmupIterations: 0,
    warmupTime: 0,
  })
  bench
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    .add('foo', async () => {})
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    .add('bar', async () => {})
    .add('error', () => {
      throw new Error('fake')
    })
    .add('abort', async () => {
      await new Promise(resolve => setTimeout(resolve, 1000))
    })

  const events: string[] = []

  const error = bench.getTask('error')

  error?.addEventListener('start', () => {
    events.push('error-start')
  })

  error?.addEventListener('error', () => {
    events.push('error-error')
  })

  error?.addEventListener('cycle', () => {
    events.push('error-cycle')
  })

  error?.addEventListener('complete', () => {
    events.push('error-complete')
  })

  bench.addEventListener('warmup', () => {
    events.push('warmup')
  })

  bench.addEventListener('start', () => {
    events.push('start')
  })

  bench.addEventListener('error', () => {
    events.push('error')
  })

  bench.addEventListener('reset', () => {
    events.push('reset')
  })

  bench.addEventListener('cycle', evt => {
    expect(evt.task?.name.trim()).not.toBe('')
    events.push('cycle')
  })

  bench.addEventListener('abort', () => {
    events.push('abort')
  })

  bench.addEventListener('add', () => {
    events.push('add')
  })

  bench.addEventListener('remove', () => {
    events.push('remove')
  })

  bench.addEventListener('complete', () => {
    events.push('complete')
  })

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  bench.add('temporary', () => {}).remove('temporary')

  setTimeout(() => {
    controller.abort()
    // the abort task takes 1000ms (500ms time || 10 iterations => 10 * 1000)
  }, 900)
  await bench.run()
  bench.reset()

  expect(events).toStrictEqual([
    'add',
    'remove',
    'warmup',
    'start',
    'cycle',
    'cycle',
    'error-start',
    'error-error',
    'error',
    'error-cycle',
    'cycle',
    'error-complete',
    'abort',
    'complete',
    'reset',
  ])

  const abortTask = bench.getTask('abort')
  // aborted has no results
  expect(abortTask?.result).toBeUndefined()
}, 10000)

test('events order at task completion', async () => {
  const bench = new Bench({ iterations: 16, time: 100 })

  bench
    .add('foo', async () => {
      await new Promise(resolve => setTimeout(resolve, 25))
    })
    .add('bar', async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

  const events: string[] = []

  const fooTask = bench.getTask('foo')
  const barTask = bench.getTask('bar')
  fooTask?.addEventListener('complete', () => {
    events.push('foo-complete')
    expect(events).toStrictEqual(['foo-complete'])
  })
  barTask?.addEventListener('complete', () => {
    events.push('bar-complete')
    expect(events).toStrictEqual(['foo-complete', 'bar-complete'])
  })

  const tasks = await bench.run()

  expect(tasks.length).toBe(2)
  expect(tasks[0]?.name).toBe('foo')
  expect(tasks[1]?.name).toBe('bar')
})

test.each(['warmup', 'run'])('%s error event', async mode => {
  const bench = new Bench({
    iterations: 32,
    time: 100,
    warmup: mode === 'warmup',
  })
  const error = new Error()

  bench.add('error', () => {
    throw error
  })

  let err: Error | undefined
  let task: Task | undefined
  bench.addEventListener('error', evt => {
    const { error: e, task: t } = evt
    err = e
    task = t
  })

  await expect(bench.run()).resolves.toBeDefined()
  expect(err).toStrictEqual(error)
  expect(task?.result?.error).toStrictEqual(error)
})

test.each(['warmup', 'run'])('%s throws', async mode => {
  const iterations = 1
  const bench = new Bench({
    iterations,
    throws: true,
    warmup: mode === 'warmup',
    warmupIterations: iterations,
  })
  const error = new Error()

  bench.add('error', () => {
    throw error
  })

  let err: Error | undefined
  let task: Task | undefined
  bench.addEventListener('error', evt => {
    const { error: e, task: t } = evt
    err = e
    task = t
  })

  await expect(bench.run()).rejects.toThrowError(error)
  expect(err).toStrictEqual(error)
  expect(task?.result?.error).toStrictEqual(error)
})

test('detect faster task', { skip: platform() !== 'linux' }, async () => {
  const bench = new Bench({ iterations: 32, time: 100 })
  bench
    .add('faster', async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    .add('slower', async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

  await bench.run()

  const fasterTask = bench.getTask('faster')
  const slowerTask = bench.getTask('slower')

  expect(fasterTask?.result?.latency.mean).toBeLessThan(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    slowerTask!.result!.latency.mean
  )
  expect(fasterTask?.result?.latency.min).toBeLessThan(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    slowerTask!.result!.latency.min
  )
  expect(fasterTask?.result?.latency.max).toBeLessThan(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    slowerTask!.result!.latency.max
  )
  // latency moe should be lesser since it's faster
  expect(fasterTask?.result?.latency.moe).toBeLessThan(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    slowerTask!.result!.latency.moe
  )

  expect(fasterTask?.result?.throughput.mean).toBeGreaterThan(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    slowerTask!.result!.throughput.mean
  )
  expect(fasterTask?.result?.throughput.min).toBeGreaterThan(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    slowerTask!.result!.throughput.min
  )
  expect(fasterTask?.result?.throughput.max).toBeGreaterThan(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    slowerTask!.result!.throughput.max
  )
  // throughput moe should be greater since it's faster
  expect(fasterTask?.result?.throughput.moe).toBeGreaterThan(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    slowerTask!.result!.throughput.moe
  )
})

test('statistics', async () => {
  const bench = new Bench({ iterations: 32, time: 100 })
  bench.add('foo', async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })
  await bench.run()

  const fooTask = bench.getTask('foo')

  expect(fooTask?.result).toBeDefined()
  expect(fooTask?.result?.runtime).toStrictEqual(bench.runtime)
  expect(fooTask?.result?.runtimeVersion).toStrictEqual(bench.runtimeVersion)
  expect(fooTask?.result?.totalTime).toBeTypeOf('number')
  expect(fooTask?.result?.period).toBeTypeOf('number')
  // deprecated
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  expect(Array.isArray(fooTask?.result?.samples)).toBe(true)
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  expect(fooTask?.result?.hz).toBeTypeOf('number')
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  expect(fooTask?.result?.min).toBeTypeOf('number')
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  expect(fooTask?.result?.max).toBeTypeOf('number')
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  expect(fooTask?.result?.mean).toBeTypeOf('number')
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  expect(fooTask?.result?.variance).toBeTypeOf('number')
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  expect(fooTask?.result?.sd).toBeTypeOf('number')
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  expect(fooTask?.result?.sem).toBeTypeOf('number')
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  expect(fooTask?.result?.df).toBeTypeOf('number')
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  expect(fooTask?.result?.critical).toBeTypeOf('number')
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  expect(fooTask?.result?.moe).toBeTypeOf('number')
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  expect(fooTask?.result?.rme).toBeTypeOf('number')
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  expect(fooTask?.result?.p75).toBeTypeOf('number')
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  expect(fooTask?.result?.p99).toBeTypeOf('number')
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  expect(fooTask?.result?.p995).toBeTypeOf('number')
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  expect(fooTask?.result?.p999).toBeTypeOf('number')
  // latency statistics
  expect(fooTask?.result?.latency).toBeTypeOf('object')
  expect(Array.isArray(fooTask?.result?.latency.samples)).toBe(true)
  expect(fooTask?.result?.latency.min).toBeTypeOf('number')
  expect(fooTask?.result?.latency.max).toBeTypeOf('number')
  expect(fooTask?.result?.latency.mean).toBeTypeOf('number')
  expect(fooTask?.result?.latency.variance).toBeTypeOf('number')
  expect(fooTask?.result?.latency.sd).toBeTypeOf('number')
  expect(fooTask?.result?.latency.sem).toBeTypeOf('number')
  expect(fooTask?.result?.latency.df).toBeTypeOf('number')
  expect(fooTask?.result?.latency.critical).toBeTypeOf('number')
  expect(fooTask?.result?.latency.moe).toBeTypeOf('number')
  expect(fooTask?.result?.latency.rme).toBeTypeOf('number')
  expect(fooTask?.result?.latency.aad).toBeTypeOf('number')
  expect(fooTask?.result?.latency.mad).toBeTypeOf('number')
  expect(fooTask?.result?.latency.p50).toBeTypeOf('number')
  expect(fooTask?.result?.latency.p75).toBeTypeOf('number')
  expect(fooTask?.result?.latency.p99).toBeTypeOf('number')
  expect(fooTask?.result?.latency.p995).toBeTypeOf('number')
  expect(fooTask?.result?.latency.p999).toBeTypeOf('number')
  // throughput statistics
  expect(fooTask?.result?.throughput).toBeTypeOf('object')
  expect(Array.isArray(fooTask?.result?.throughput.samples)).toBe(true)
  expect(fooTask?.result?.throughput.max).toBeTypeOf('number')
  expect(fooTask?.result?.throughput.mean).toBeTypeOf('number')
  expect(fooTask?.result?.throughput.variance).toBeTypeOf('number')
  expect(fooTask?.result?.throughput.sd).toBeTypeOf('number')
  expect(fooTask?.result?.throughput.sem).toBeTypeOf('number')
  expect(fooTask?.result?.throughput.df).toBeTypeOf('number')
  expect(fooTask?.result?.throughput.critical).toBeTypeOf('number')
  expect(fooTask?.result?.throughput.moe).toBeTypeOf('number')
  expect(fooTask?.result?.throughput.rme).toBeTypeOf('number')
  expect(fooTask?.result?.throughput.aad).toBeTypeOf('number')
  expect(fooTask?.result?.throughput.mad).toBeTypeOf('number')
  expect(fooTask?.result?.throughput.p50).toBeTypeOf('number')
  expect(fooTask?.result?.throughput.p75).toBeTypeOf('number')
  expect(fooTask?.result?.throughput.p99).toBeTypeOf('number')
  expect(fooTask?.result?.throughput.p995).toBeTypeOf('number')
  expect(fooTask?.result?.throughput.p999).toBeTypeOf('number')
})

test('setup and teardown', async () => {
  const calls: string[] = []
  const setup = vi.fn(() => {
    calls.push('setup')
  })
  const teardown = vi.fn(() => {
    calls.push('teardown')
  })
  const bench = new Bench({
    iterations: 32,
    setup,
    teardown,
    time: 100,
  })
  bench.add('foo', async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })
  const fooTask = bench.getTask('foo')

  await bench.run()

  expect(setup).toBeCalledWith(fooTask, 'warmup')
  expect(setup).toBeCalledWith(fooTask, 'run')
  expect(setup).toHaveBeenCalledTimes(2)
  expect(teardown).toBeCalledWith(fooTask, 'warmup')
  expect(teardown).toBeCalledWith(fooTask, 'run')
  expect(teardown).toHaveBeenCalledTimes(2)
  expect(calls).toStrictEqual(['setup', 'teardown', 'setup', 'teardown'])
})

test('task beforeAll, afterAll, beforeEach, afterEach', async () => {
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
  expect(afterAll).toHaveBeenCalledTimes(2 /* warmup + run */)
  expect(beforeAll.mock.calls.length).toBe(afterAll.mock.calls.length)
  expect(beforeEach).toHaveBeenCalledTimes(iterations * 2 /* warmup + run */)
  expect(afterEach).toHaveBeenCalledTimes(iterations * 2 /* warmup + run */)
  expect(beforeEach.mock.calls.length).toBe(afterEach.mock.calls.length)
})

test(
  'task with promiseLike return',
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

test.each(['warmup', 'run'])('%s error handling', async mode => {
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

test('throw error in beforeAll, afterAll, beforeEach, afterEach', async () => {
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

test('removing non-existing task should not throw', () => {
  const bench = new Bench()
  bench.addEventListener('remove', () => {
    expect.unreachable()
  })

  bench.remove('non-existent')
})
