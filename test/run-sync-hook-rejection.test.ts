import { expect, test } from 'vitest'

import type { HookMode, Task } from '../src'

import { Bench } from '../src'

// Integration exception: an unhandled rejection is detected by the runtime
// itself, so these tests observe the platform's own `unhandledRejection`
// channel. Turns are drained through the real task queue; no duration is
// guessed and no channel is faked.
const flushTurns = (turns: number): Promise<void> =>
  new Promise((resolve) => {
    let remaining = turns
    const turn = (): void => {
      if (--remaining === 0) resolve()
      else setTimeout(turn, 0)
    }
    setTimeout(turn, 0)
  })

/**
 * Listens for unhandled rejections and uncaught exceptions on the current
 * runtime.
 * @returns the collected rejection reasons and exceptions and a function to
 *   stop listening
 */
function listenToUnhandledEvents (): {
  exceptions: unknown[]
  reasons: unknown[]
  stop: () => void
} {
  const reasons: unknown[] = []
  const exceptions: unknown[] = []
  const onRejection = (reason: unknown): void => {
    reasons.push(reason)
  }
  const onException = (error: unknown): void => {
    exceptions.push(error)
  }
  process.on('unhandledRejection', onRejection)
  process.on('uncaughtException', onException)
  return {
    exceptions,
    reasons,
    stop: () => {
      process.off('unhandledRejection', onRejection)
      process.off('uncaughtException', onException)
    },
  }
}

const rejecting = (): Promise<never> =>
  Promise.reject(new Error('rejected hook result'))

const taskSources = [
  'fn',
  'beforeAll',
  'beforeEach',
  'afterEach',
  'afterAll',
] as const

test.each(taskSources)(
  'runSync() keeps a rejecting %s result handled',
  async (source) => {
    const bench = new Bench({
      iterations: 2,
      throws: false,
      time: 0,
      warmup: false,
    })
    bench.add(
      'task',
      source === 'fn' ? () => rejecting() : () => 1,
      source === 'fn' ? {} : { [source]: () => rejecting() }
    )

    const { reasons, stop } = listenToUnhandledEvents()
    bench.runSync()
    await flushTurns(3)
    stop()

    expect(reasons).toEqual([])
    const expected =
      source === 'fn'
        ? 'task function must be sync when using `runSync()`'
        : `\`${source}\` function must be sync when using \`runSync()\``
    const result = bench.getTask('task')?.result
    if (result?.state !== 'errored') {
      expect.fail(`expected an errored task, got ${String(result?.state)}`)
    }
    expect(result.error.message).toBe(expected)
  }
)

test.each([
  ['setup', 'run'],
  ['setup', 'warmup'],
  ['teardown', 'run'],
  ['teardown', 'warmup'],
] as const)(
  'runSync() keeps a rejecting bench %s result handled during %s',
  async (source, phase) => {
    const modes: HookMode[] = []
    const bench = new Bench({
      iterations: 2,
      [source]: (_task: Task, mode: HookMode) => {
        modes.push(mode)
        return rejecting()
      },
      throws: false,
      time: 0,
      warmup: phase === 'warmup',
      warmupIterations: 2,
      warmupTime: 0,
    })
    bench.add('task', () => 1)

    const { reasons, stop } = listenToUnhandledEvents()
    let thrown: Error | undefined
    try {
      bench.runSync()
    } catch (error) {
      // bench-level hook violations throw out of `runSync()`
      thrown = error as Error
    }
    await flushTurns(3)
    stop()

    expect(reasons).toEqual([])
    expect(modes).toEqual([phase])
    expect(thrown?.message).toBe(
      `\`${source}\` function must be sync when using \`runSync()\``
    )
  }
)

test('a task returning a thenable whose `then` call rejects leaks no unhandled rejection', async () => {
  const thenable = {
    then (resolve: (value?: unknown) => void): Promise<void> {
      resolve(undefined)
      return Promise.reject(new Error('late'))
    },
  }
  const bench = new Bench({ warmup: false })
  bench.add(
    'task',
    () => thenable,
    { async: false }
  )

  const { reasons, stop } = listenToUnhandledEvents()
  await bench.run()
  await flushTurns(3)
  stop()

  expect(reasons).toEqual([])
  expect(bench.getTask('task')?.result).toMatchObject({
    error: {
      message: 'task function must be sync when using `runSync()`',
    },
    state: 'errored',
  })
})

test('a thenable fulfilling with a rejected promise leaks no unhandled rejection', async () => {
  const thenable = {
    then (resolve: (value: unknown) => void): void {
      resolve(Promise.reject(new Error('nested')))
    },
  }
  const bench = new Bench({ warmup: false })
  bench.add('task', () => thenable, {
    async: false,
  })

  const { reasons, stop } = listenToUnhandledEvents()
  await bench.run()
  await flushTurns(3)
  stop()

  expect(reasons).toEqual([])
  expect(bench.getTask('task')?.result).toMatchObject({
    error: {
      message: 'task function must be sync when using `runSync()`',
    },
    state: 'errored',
  })
})

test.each(['overriddenDuration', 'overriddenIterationCost'] as const)(
  'a rejected promise in `%s` leaks no unhandled rejection',
  async (field) => {
    const thenable = {
      then (resolve: (value: unknown) => void): void {
        resolve(Promise.reject(new Error('nested')))
      },
    }
    const bench = new Bench({ time: 5, warmup: false })
    bench.add('task', () => ({ [field]: thenable }))

    const { reasons, stop } = listenToUnhandledEvents()
    await bench.run()
    await flushTurns(3)
    stop()

    expect(reasons).toEqual([])
    expect(bench.getTask('task')?.result.state).toBe('completed')
  }
)

test('a fulfillment thenable returning a rejected promise leaks no unhandled rejection', async () => {
  const inner = {
    then (resolve: (value: unknown) => void): Promise<void> {
      resolve(1)
      return Promise.reject(new Error('late'))
    },
  }
  const outer = {
    then (resolve: (value: unknown) => void): void {
      resolve(inner)
    },
  }
  const bench = new Bench({ time: 5, warmup: false })
  bench.add(
    'task',
    () => ({ overriddenDuration: outer })
  )

  const { reasons, stop } = listenToUnhandledEvents()
  await bench.run()
  await flushTurns(3)
  stop()

  expect(reasons).toEqual([])
  expect(bench.getTask('task')?.result.state).toBe('completed')
})

test('a fulfillment value whose `then` getter throws throws no exception', async () => {
  const boom = new Error('boom')
  const thenable = {
    then (resolve: (value: unknown) => void): void {
      setTimeout(() => {
        resolve({
          get then (): never {
            throw boom
          },
        })
      }, 0)
    },
  }
  const bench = new Bench({ warmup: false })
  bench.add('task', () => thenable, {
    async: false,
  })

  const { exceptions, reasons, stop } = listenToUnhandledEvents()
  await bench.run()
  await flushTurns(3)
  stop()

  expect(reasons).toEqual([])
  expect(exceptions).toEqual([])
  expect(bench.getTask('task')?.result).toMatchObject({
    error: {
      message: 'task function must be sync when using `runSync()`',
    },
    state: 'errored',
  })
})

test('a self-fulfilling thenable completes the probe without endless work', async () => {
  const self: { then(resolve: (value: unknown) => void): void } = {
    then (resolve: (value: unknown) => void): void {
      resolve(self)
    },
  }
  const bench = new Bench({ warmup: false })
  bench.add('task', () => self, {
    async: false,
  })

  const { reasons, stop } = listenToUnhandledEvents()
  await bench.run()
  await flushTurns(3)
  stop()

  expect(reasons).toEqual([])
  expect(bench.getTask('task')?.result.state).toBe('errored')
})

test('a throwing `then` getter at the terminal depth throws no exception', async () => {
  const boom = new Error('terminal-boom')
  const inner = {
    get then (): never {
      throw boom
    },
  }
  const mid = {
    then (resolve: (value: unknown) => void): void {
      resolve(inner)
    },
  }
  const outer = {
    then (resolve: (value: unknown) => void): void {
      resolve(mid)
    },
  }
  const bench = new Bench({ warmup: false })
  bench.add('task', () => outer, {
    async: false,
  })

  const { exceptions, reasons, stop } = listenToUnhandledEvents()
  await bench.run()
  await flushTurns(3)
  stop()

  expect(reasons).toEqual([])
  expect(exceptions).toEqual([])
  expect(bench.getTask('task')?.result.state).toBe('errored')
})

test('a rejected promise returned by a returned thenable leaks no unhandled rejection', async () => {
  const inner = {
    then (resolve: (value: unknown) => void): Promise<void> {
      resolve(1)
      return Promise.reject(new Error('returned-chain'))
    },
  }
  const outer = {
    then (): unknown {
      return inner
    },
  }
  const bench = new Bench({ warmup: false })
  bench.add('task', () => outer, {
    async: false,
  })

  const { reasons, stop } = listenToUnhandledEvents()
  await bench.run()
  await flushTurns(3)
  stop()

  expect(reasons).toEqual([])
  expect(bench.getTask('task')?.result.state).toBe('errored')
})

test('a native promise rejecting with itself terminates without leaks', async () => {
  const selfRejecting: Promise<number> = Promise.resolve().then(() => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- a promise may reject with itself
    throw selfRejecting
  })
  const bench = new Bench({ warmup: false })
  bench.add('task', () => selfRejecting, { async: false })

  const { exceptions, reasons, stop } = listenToUnhandledEvents()
  await bench.run()
  await flushTurns(3)
  stop()

  expect(reasons).toEqual([])
  expect(exceptions).toEqual([])
  expect(bench.getTask('task')?.result.state).toBe('errored')
})

test('mutually rejecting native promises terminate without leaks', async () => {
  // `b` rejects with `a` (pending); `a` later rejects with `b`: a cycle fully
  // reachable at probe time.
  const a = new Promise<number>((_resolve, reject) => {
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- rejection reasons may be promises (cycle test)
      reject(b)
    }, 0)
  })
  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- rejection reasons may be promises (cycle test)
  const b: Promise<number> = Promise.reject(a)
  const bench = new Bench({ warmup: false })
  bench.add('task', () => b, { async: false })

  const { exceptions, reasons, stop } = listenToUnhandledEvents()
  await bench.run()
  await flushTurns(5)
  stop()

  expect(reasons).toEqual([])
  expect(exceptions).toEqual([])
  expect(bench.getTask('task')?.result.state).toBe('errored')
})

const foreignRealm = await import('node:vm').catch(() => undefined)

const testForeign = foreignRealm == null ? test.skip : test

testForeign(
  'a foreign-realm rejected promise at terminal depth leaks no unhandled rejection',
  async () => {
    if (foreignRealm == null) {
      return
    }
    const context = foreignRealm.createContext({})
    const foreign = foreignRealm.runInContext(
      'new Promise((_resolve, reject) => { globalThis.rejecter = reject })',
      context
    ) as Promise<unknown>
    const rejectForeign = foreignRealm.runInContext(
      'globalThis.rejecter',
      context
    ) as (reason: unknown) => void

    const inner = {
      then (resolve: (value: unknown) => void): void {
        resolve(foreign)
      },
    }
    const mid = {
      then (resolve: (value: unknown) => void): void {
        resolve(inner)
      },
    }
    const outer = {
      then (resolve: (value: unknown) => void): void {
        resolve(mid)
      },
    }
    const bench = new Bench({ warmup: false })
    bench.add('task', () => outer, {
      async: false,
    })

    const { exceptions, reasons, stop } = listenToUnhandledEvents()
    await bench.run()
    rejectForeign(new Error('cross-realm'))
    await flushTurns(5)
    stop()

    expect(reasons).toEqual([])
    expect(exceptions).toEqual([])
    expect(bench.getTask('task')?.result.state).toBe('errored')
  }
)

test('a thenable returning a rejected promise at the last followed depth leaks nothing', async () => {
  const third = {
    then (): Promise<unknown> {
      return Promise.reject(new Error('deep-returned'))
    },
  }
  const second = {
    then (resolve: (value: unknown) => void): void {
      resolve(third)
    },
  }
  const first = {
    then (resolve: (value: unknown) => void): void {
      resolve(second)
    },
  }
  const bench = new Bench({ warmup: false })
  bench.add('task', () => first, {
    async: false,
  })

  const { exceptions, reasons, stop } = listenToUnhandledEvents()
  await bench.run()
  await flushTurns(5)
  stop()

  expect(reasons).toEqual([])
  expect(exceptions).toEqual([])
  expect(bench.getTask('task')?.result.state).toBe('errored')
})
