import { expect, test } from 'vitest'

import { Bench } from '../src'

// Integration exception: an unhandled rejection is detected by the runtime
// itself, so the assertion must observe the platform's own
// `unhandledRejection` channel after the runtime drains its task queue.
// Only the rejection trigger is synchronous; no duration is guessed.
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
  Promise.reject(new Error('late rejection'))

test.each(['fn', 'beforeAll', 'beforeEach', 'afterEach', 'afterAll'] as const)(
  'runSync() keeps a rejecting %s result handled',
  async (source) => {
    const bench = new Bench({ throws: false, warmup: false })
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
    expect(bench.getTask('task')?.result.state).toBe('errored')
  }
)

test.each(['setup', 'teardown'] as const)(
  'runSync() keeps a rejecting bench %s result handled',
  async (source) => {
    const bench = new Bench({
      [source]: () => rejecting(),
      throws: false,
      warmup: false,
    })
    bench.add('task', () => 1)

    const { reasons, stop } = listenToUnhandledRejections()
    try {
      bench.runSync()
    } catch {
      // bench-level hook violations throw out of `runSync()`
    }
    await flushTurns(3)
    stop()

    expect(reasons).toEqual([])
  }
)
