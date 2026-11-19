import { expect, test } from 'vitest'

import { Bench } from '../src'

// See test/run-sync-hook-rejection.test.ts: the runtime's own
// `unhandledRejection` channel is the assertion target; turns are drained
// through the real task queue.
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
  Promise.reject(new Error('rejected override'))

test.each(['overriddenDuration', 'overriddenIterationCost'] as const)(
  'a rejecting %s override is ignored without an unhandled rejection',
  async (field) => {
    // The add-time probe calls the task function once and discards its
    // result before any extractor runs; only measuring calls carry the
    // rejecting override. Zero time budgets pin exactly two measured
    // iterations.
    let calls = 0
    const bench = new Bench({
      iterations: 2,
      throws: false,
      time: 0,
      warmup: false,
    })
    bench.add('task', () => (calls++ === 0 ? {} : { [field]: rejecting() }))

    const { reasons, stop } = listenToUnhandledRejections()
    bench.runSync()
    await flushTurns(3)
    stop()

    expect(reasons).toEqual([])
    // an invalid override behaves like an absent one: probe call plus the
    // two measured iterations, task completed
    expect(calls).toBe(3)
    expect(bench.getTask('task')?.result.state).toBe('completed')
  }
)
