// Portions copyright evanwashere. 2024. All Rights Reserved.
// Portions copyright QuiiBz. 2023-2024. All Rights Reserved.

import type { TimestampProvider, TimestampValue } from './types'

import { toError } from './error'
import { performanceNowTimestampProvider } from './timestamp'

interface WithConcurrencyOptions<R> {
  /**
   * The function to execute concurrently.
   */
  fn: () => Promise<R>
  /**
   * The number of iterations to execute. If 0, runs until time limit is reached.
   */
  iterations: number
  /**
   * The maximum number of concurrent executions.
   */
  limit: number
  /**
   * An optional AbortSignal to cancel the execution.
   */
  signal?: AbortSignal | undefined
  /**
   * The maximum amount of time to run the executions in milliseconds. If 0,
   * runs until iterations are completed.
   */
  time?: number
  /**
   * The high-resolution timestamp function to use.
   * @returns a timestamp
   */
  timestampProvider?: TimestampProvider
}

/**
 * Creates a concurrency limiter that can execute functions with a maximum concurrency limit.
 * @param options - The resource containing the function to execute and other options
 * @returns A promise that resolves to an array of results.
 * @throws {Error} if a single error occurs during execution
 * @throws {AggregateError} if multiple errors occur during execution
 */
export const withConcurrency = async <R>(
  options: WithConcurrencyOptions<R>
): Promise<R[]> => {
  const {
    fn,
    iterations,
    limit,
    signal,
    time = 0,
    timestampProvider = performanceNowTimestampProvider,
  } = options

  const maxWorkers =
    iterations === 0 ? limit : Math.max(0, Math.min(limit, iterations))

  const errors: Error[] = []
  const results: R[] = []

  let isRunning = true
  let nextIndex = 0

  const hasTimeLimit = Number.isFinite(time) && time > 0
  const hasIterationsLimit = iterations > 0
  let targetTime: TimestampValue = 0

  const timestampFn = timestampProvider.fn

  // Reduce checks based on provided limits to avoid tainting the benchmark results
  const doNext: () => boolean = hasIterationsLimit
    ? hasTimeLimit
      ? () =>
          isRunning &&
          nextIndex++ < iterations &&
          (timestampFn() < targetTime || (isRunning = false))
      : () => isRunning && nextIndex++ < iterations
    : hasTimeLimit
      ? () => isRunning && (timestampFn() < targetTime || (isRunning = false))
      : () => isRunning

  const pushResult = (r: R) => {
    isRunning && results.push(r)
  }
  const pushError = (e: unknown) => {
    errors.push(toError(e))
  }

  const onAbort = () => (isRunning = false)

  if (signal) {
    if (signal.aborted) return []
    signal.addEventListener('abort', onAbort)
  }

  const worker = async () => {
    while (doNext()) {
      try {
        pushResult(await fn())
      } catch (err) {
        isRunning = false
        pushError(err)
        break
      }
    }
  }

  if (hasTimeLimit) {
    targetTime =
      (timestampFn() as number) + (timestampProvider.fromMs(time) as number)
  }
  const promises = Array.from({ length: maxWorkers }, () => worker())
  await Promise.allSettled(promises)

  if (errors.length === 0) return results
  if (errors.length === 1) throw errors[0] // eslint-disable-line @typescript-eslint/only-throw-error
  throw new AggregateError(
    errors,
    'Multiple errors occurred during concurrent execution'
  )
}
