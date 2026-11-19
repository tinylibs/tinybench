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
 * Listens for unhandled rejections on the current runtime.
 * @returns the collected rejection reasons and a function to stop listening
 */
function listenToUnhandledRejections (): {
  reasons: unknown[]
  stop: () => void
} {
  const reasons: unknown[] = []
  const listener = (reason: unknown): void => {
    reasons.push(reason)
  }
  process.on('unhandledRejection', listener)
  return {
    reasons,
    stop: () => {
      process.off('unhandledRejection', listener)
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

    const { reasons, stop } = listenToUnhandledRejections()
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

    const { reasons, stop } = listenToUnhandledRejections()
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
