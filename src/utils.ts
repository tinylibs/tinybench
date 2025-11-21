// Portions copyright evanwashere. 2024. All Rights Reserved.
// Portions copyright QuiiBz. 2023-2024. All Rights Reserved.

import type { Task } from './task'
import type {
  ConsoleTableConverter,
  Fn,
  JSRuntime,
  Samples,
  SortedSamples,
  Statistics,
} from './types'

import { emptyFunction, tTable } from './constants'

/**
 * Detects the current JavaScript runtime environment and its version.
 * @param g - the global object
 * @returns the detected runtime and its version
 */
export function detectRuntime (g = globalThis as Record<string, unknown>): {
  runtime: JSRuntime
  version: string
} {
  let runtime: JSRuntime = 'unknown'
  let version = 'unknown'

  if (
    !!g.Bun ||
    !!(
      g.process &&
      (g.process as { versions?: Record<string, string> }).versions?.bun
    )
  ) {
    runtime = 'bun'
    version = (g.Bun as { version: string }).version || 'unknown'
  } else if (g.Deno) {
    runtime = 'deno'
    version =
      (g.Deno as { version?: { deno: string } }).version?.deno ?? 'unknown'
  } else if (
    g.process &&
    (g.process as { release?: { name: string } }).release?.name === 'node'
  ) {
    runtime = 'node'
    version =
      (g.process as { versions?: { node: string } }).versions?.node ?? 'unknown'
  } else if (g.HermesInternal) {
    runtime = 'hermes'
    version =
      (
        g.HermesInternal as {
          getRuntimeProperties?: () => Record<string, string>
        }
      ).getRuntimeProperties?.()['OSS Release Version'] ?? 'unknown'
  } else if (
    hasNavigatorWithUserAgent(g) &&
    g.navigator.userAgent === 'Cloudflare-Workers'
  ) {
    runtime = 'workerd'
  } else if (
    hasNavigatorWithUserAgent(g) &&
    g.navigator.userAgent.toLowerCase().startsWith('quickjs-ng')
  ) {
    runtime = 'quickjs-ng'
    version = g.navigator.userAgent.split('/')[1] ?? 'unknown'
  } else if (typeof g.Netlify === 'object') {
    runtime = 'netlify'
  } else if (typeof g.EdgeRuntime === 'string') {
    runtime = 'edge-light'
  } else if (g.__lagon__) {
    runtime = 'lagon'
  } else if (g.fastly) {
    runtime = 'fastly'
  } else if (!!g.$262 && !!g.lockdown && !!g.AsyncDisposableStack) {
    runtime = 'moddable'
  } else if (g.d8) {
    runtime = 'v8'
    version =
      typeof g.version === 'function'
        ? (g.version as () => string)()
        : 'unknown'
  } else if (
    !!g.inIon &&
    !!(g.performance && (g.performance as { mozMemory?: unknown }).mozMemory)
  ) {
    runtime = 'spidermonkey'
  } else if (typeof g.$ === 'object' && g.$ !== null && 'IsHTMLDDA' in g.$) {
    runtime = 'jsc'
  } else if (!!g.window && !!g.navigator) {
    runtime = 'browser'
  }

  return {
    runtime,
    version,
  }
}

/**
 * Checks whether the global object has a navigator with userAgent.
 * @param g - the global object
 * @returns whether the global object has a navigator with userAgent
 */
function hasNavigatorWithUserAgent (
  g = globalThis as Record<string, unknown>
): g is { navigator: Navigator } {
  return (
    typeof g.navigator === 'object' &&
    g.navigator !== null &&
    typeof (g.navigator as Navigator).userAgent === 'string'
  )
}

export const { runtime, version: runtimeVersion } = detectRuntime()

/**
 * Converts nanoseconds to milliseconds.
 * @param ns - the nanoseconds to convert
 * @returns the milliseconds
 */
export const nToMs = (ns: number) => ns / 1e6

/**
 * Converts milliseconds to nanoseconds.
 * @param ms - the milliseconds to convert
 * @returns the nanoseconds
 */
export const mToNs = (ms: number) => ms * 1e6

/**
 * Formats a number with the specified significant digits and maximum fraction digits.
 * @param value - the number to format
 * @param significantDigits - the number of significant digits in the output to aim for
 * @param maxFractionDigits - hard limit for the number of digits after the decimal dot
 * @returns the formatted number
 */
export const formatNumber = (
  value: number,
  significantDigits = 5,
  maxFractionDigits = 2
): string => {
  if (value === Number.POSITIVE_INFINITY) return '+∞'
  if (value === Number.NEGATIVE_INFINITY) return '-∞'
  if (Number.isNaN(value)) return 'NaN'

  const absValue = Math.abs(value)

  // Round large numbers to integers, but not to multiples of 10.
  // The actual number of significant digits may be more than `significantDigits`.
  if (absValue >= 10 ** significantDigits) {
    return value.toFixed()
  }

  // Round small numbers to have `maxFractionDigits` digits after the decimal dot.
  // The actual number of significant digits may be less than `significantDigits`.
  if (absValue < 10 ** (significantDigits - maxFractionDigits)) {
    return value.toFixed(maxFractionDigits)
  }

  // Avoid scientific notation
  const decimals = Math.min(
    Math.max(0, significantDigits - (Math.floor(Math.log10(absValue)) + 1)),
    maxFractionDigits
  )

  return value.toFixed(decimals)
}

const hrtimeBigint: () => bigint =
  typeof (globalThis as { process?: { hrtime?: { bigint: () => bigint } } })
    .process?.hrtime?.bigint === 'function'
    ? (
        globalThis as unknown as {
          process: { hrtime: { bigint: () => bigint } }
        }
      ).process.hrtime.bigint.bind(
        (
          globalThis as unknown as {
            process: { hrtime: { bigint: () => bigint } }
          }
        ).process.hrtime
      )
    : () => {
        throw new Error(
          'hrtime.bigint() is not supported in this JS environment'
        )
      }

/**
 * Returns the current high resolution timestamp in milliseconds using `process.hrtime.bigint()`.
 * @returns the current high resolution timestamp in milliseconds
 */
export const hrtimeNow = () => nToMs(Number(hrtimeBigint()))

/**
 * Returns the current high resolution timestamp in milliseconds using `performance.now()`.
 * @returns the current high resolution timestamp in milliseconds
 */
export const performanceNow = performance.now.bind(performance)

/**
 * Checks whether a value is a promise-like object.
 * @param maybePromiseLike - the value to check
 * @returns whether the value is a promise-like object
 */
export const isPromiseLike = <T>(
  maybePromiseLike: unknown
): maybePromiseLike is PromiseLike<T> =>
    maybePromiseLike !== null &&
  (typeof maybePromiseLike === 'object' ||
    typeof maybePromiseLike === 'function') &&
  typeof (maybePromiseLike as PromiseLike<T>).then === 'function'

type AsyncFunctionType<A extends unknown[], R> = (...args: A) => PromiseLike<R>

const AsyncFunctionConstructor = (async () => {
  /* no op */
}).constructor as FunctionConstructor

/**
 * Checks whether a function is an async function, only considering runtime support for async syntax.
 * @param fn - the function to check
 * @returns whether the function is an async function
 */
const isAsyncFunction = (
  fn: Fn | null | undefined
): fn is AsyncFunctionType<unknown[], unknown> =>
  typeof fn === 'function' && fn.constructor === AsyncFunctionConstructor

/**
 * Checks whether a function is an async function or returns a promise, considering runtime support for async syntax and promise return.
 * @param fn - the function to check
 * @returns whether the function is an async function or returns a promise
 */
export const isFnAsyncResource = (fn: Fn | null | undefined): boolean => {
  if (fn == null) {
    return false
  }
  if (isAsyncFunction(fn)) {
    return true
  }
  try {
    const fnCall = fn()
    const promiseLike = isPromiseLike(fnCall)
    if (promiseLike) {
      // silence promise rejection
      try {
        (fnCall.then(emptyFunction) as Promise<unknown>).catch(emptyFunction)
      } catch {
        // ignore
      }
    }
    return promiseLike
  } catch {
    return false
  }
}

/**
 * Checks if a value is a Samples type.
 * @param value - value to check
 * @returns if the value is a Samples type, meaning a non-empty array of numbers
 */
export const isValidSamples = (
  value: number[] | undefined
): value is Samples => {
  return Array.isArray(value) && value.length !== 0
}

/**
 * Sorts samples in place.
 * @param samples - samples to sort
 */
export function sortSamples (
  samples: Samples
): asserts samples is SortedSamples {
  samples.sort(sortFn)
}

/**
 * Computes the mean and variance of a sample.
 * @param samples - the sample
 * @returns an object containing the mean and variance
 */
export const meanAndVariance = (
  samples: Samples
): { mean: number; vr: number } => {
  const len = samples.length
  if (len === 1) {
    return { mean: samples[0], vr: 0 }
  }

  let mean = 0
  let m = 0
  let x = 0
  let d = 0
  let i = 0

  while (i < len) {
    x = samples[i++]! // eslint-disable-line @typescript-eslint/no-non-null-assertion
    d = x - mean
    mean += d / i
    m += d * (x - mean)
  }

  return {
    mean,
    vr: m / (len - 1),
  }
}

/**
 * Computes the q-quantile of a sorted sample.
 * @param samples - the sorted sample
 * @param q - the quantile to compute
 * @returns the q-quantile of the sample
 */
const quantileSorted = (
  samples: SortedSamples,
  q: 0.5 | 0.75 | 0.99 | 0.995 | 0.999
): number => {
  const base = (samples.length - 1) * q
  const baseIndex = Math.floor(base)

  return baseIndex + 1 < samples.length
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ? samples[baseIndex]! +
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (base - baseIndex) * (samples[baseIndex + 1]! - samples[baseIndex]!)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    : samples[baseIndex]!
}

/**
 * A sort function to be passed to Array.prototype.sort for numbers.
 * @param a - first number
 * @param b - second number
 * @returns a number indicating the sort order
 */
export const sortFn = (a: number, b: number) => a - b

/**
 * Computes the average absolute deviation from the mean.
 * @param samples - the sample
 * @param mean - the mean of the sample
 * @returns the average absolute deviation
 */
export const absoluteDeviationMean = (
  samples: Samples,
  mean: number
): number => {
  let result = 0
  const len = samples.length

  let i = 0

  while (i < len) {
    result += (Math.abs(samples[i++]! - mean) - result) / i // eslint-disable-line @typescript-eslint/no-non-null-assertion
  }

  return result
}

/**
 * Computes the median absolute deviation from the median.
 * @param samples - the sorted sample
 * @param median - the median of the sample
 * @returns the median absolute deviation
 */
export function absoluteDeviationMedian (
  samples: SortedSamples,
  median: number
): number {
  const len = samples.length
  if (len === 1) return 0

  const mid = len >> 1
  const halfLen = (len + 1) >> 1

  let low = 0
  let high = mid
  let c1, c2, l1, l2, r1, r2

  while (low <= high) {
    c1 = (low + high) >> 1
    c2 = halfLen - c1

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    l1 = c1 === 0 ? Number.NEGATIVE_INFINITY : median - samples[mid - c1]!

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    r1 = c1 === mid ? Number.POSITIVE_INFINITY : median - samples[mid - c1 - 1]!

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    l2 = c2 === 0 ? Number.NEGATIVE_INFINITY : samples[mid + c2 - 1]! - median

    r2 =
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      c2 === len - mid ? Number.POSITIVE_INFINITY : samples[mid + c2]! - median

    if (l1 <= r2 && l2 <= r1) {
      return len & 1 // check for odd length
        ? Math.max(l1, l2)
        : (Math.max(l1, l2) + Math.min(r1, r2)) / 2
    }

    if (l1 > r2) {
      high = c1 - 1
    } else {
      low = c1 + 1
    }
  }
  return 0 // should never reach here
}

/**
 * Computes the statistics of a sample.
 * The sample must be sorted.
 * @param samples - the sorted sample
 * @param retainSamples - whether to keep the samples in the statistics
 * @returns the statistics of the sample
 */
export function getStatisticsSorted (samples: SortedSamples, retainSamples = false): Statistics {
  const { mean, vr } = meanAndVariance(samples)
  const sd = Math.sqrt(vr)
  const sem = sd / Math.sqrt(samples.length)
  const df = samples.length - 1
  const critical = tTable[df || 1] ?? tTable[0]
  const moe = sem * critical
  const absMean = Math.abs(mean)
  const rme = absMean === 0 ? Number.POSITIVE_INFINITY : (moe / absMean) * 100
  const p50 = quantileSorted(samples, 0.5)

  return {
    aad: absoluteDeviationMean(samples, mean),
    critical,
    df,
    mad: absoluteDeviationMedian(samples, p50),
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    max: samples[df]!,
    mean,
    min: samples[0],
    moe,
    p50,
    p75: quantileSorted(samples, 0.75),
    p99: quantileSorted(samples, 0.99),
    p995: quantileSorted(samples, 0.995),
    p999: quantileSorted(samples, 0.999),
    rme,
    samples: retainSamples ? samples : undefined,
    samplesCount: samples.length,
    sd,
    sem,
    variance: vr,
  }
}

/**
 * Throws an error if the condition is false.
 * @param condition - the condition to check
 * @param message - the error message to throw if the condition is false
 * @throws {Error} if the condition is false
 */
export const assert = (condition: boolean, message: string): void => {
  if (!condition) {
    const stackTraceLimit = Error.stackTraceLimit
    try {
      Error.stackTraceLimit = 0
      const error = new Error(message)
      Error.stackTraceLimit = stackTraceLimit
      stackTraceLimit !== 0 && Error.captureStackTrace(error, assert)
      throw error
    } finally {
      Error.stackTraceLimit = stackTraceLimit
    }
  }
}

/**
 * Thrown errors can be of any type. This function converts any value to an Error object.
 * @param value - value to convert to Error
 * @returns the converted Error
 */
export const toError = (value: unknown): Error => {
  switch (typeof value) {
    case 'function':
      return new Error(value.name)
    case 'object':
      if (value !== null) {
        return value instanceof Error
          ? value
          : new Error((value as { message?: string }).message ?? '')
      }
    // eslint-disable-next-line no-fallthrough
    case 'undefined':
      return new Error()
    case 'string':
      return new Error(value)
    default:
      return new Error(String(value))
  }
}

export const defaultConvertTaskResultForConsoleTable: ConsoleTableConverter = (
  task: Task
): Record<string, number | string> => {
  const state = task.result.state
  /* eslint-disable perfectionist/sort-objects */
  return {
    'Task name': task.name,
    ...(state === 'aborted-with-statistics' || state === 'completed'
      ? {
          'Latency avg (ns)': `${formatNumber(mToNs(task.result.latency.mean), 5, 2)} \xb1 ${task.result.latency.rme.toFixed(2)}%`,
          'Latency med (ns)': `${formatNumber(mToNs(task.result.latency.p50), 5, 2)} \xb1 ${formatNumber(mToNs(task.result.latency.mad), 5, 2)}`,
          'Throughput avg (ops/s)': `${Math.round(task.result.throughput.mean).toString()} \xb1 ${task.result.throughput.rme.toFixed(2)}%`,
          'Throughput med (ops/s)': `${Math.round(task.result.throughput.p50).toString()} \xb1 ${Math.round(task.result.throughput.mad).toString()}`,
          Samples: task.result.latency.samplesCount,
        }
      : state !== 'errored'
        ? {
            'Latency avg (ns)': 'N/A',
            'Latency med (ns)': 'N/A',
            'Throughput avg (ops/s)': 'N/A',
            'Throughput med (ops/s)': 'N/A',
            Samples: 'N/A',
            Remarks: state,
          }
        : {
            Error: task.result.error.message,
            Stack: task.result.error.stack ?? 'N/A',
          }),
    ...(state === 'aborted-with-statistics' && {
      Remarks: state,
    }),
  }
  /* eslint-enable perfectionist/sort-objects */
}

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
   * A function that returns the current timestamp.
   * @returns a timestamp
   */
  now?: () => number
  /**
   * An optional AbortSignal to cancel the execution.
   */
  signal?: AbortSignal
  /**
   * The maximum amount of time to run the executions in milliseconds. If 0,
   * runs until iterations are completed.
   */
  time?: number
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
    now = performanceNow,
    signal,
    time = 0,
  } = options

  const maxWorkers =
    iterations === 0 ? limit : Math.max(0, Math.min(limit, iterations))

  const errors: Error[] = []
  const results: R[] = []

  let isRunning = true
  let nextIndex = 0

  const hasTimeLimit = Number.isFinite(time) && time > 0
  const hasIterationsLimit = iterations > 0
  let targetTime = 0

  // Reduce checks based on provided limits to avoid tainting the benchmark results
  const doNext: () => boolean = hasIterationsLimit
    ? hasTimeLimit
      ? () =>
          isRunning &&
          nextIndex++ < iterations &&
          (now() < targetTime || (isRunning = false))
      : () => isRunning && nextIndex++ < iterations
    : hasTimeLimit
      ? () => isRunning && (now() < targetTime || (isRunning = false))
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

  if (hasTimeLimit) targetTime = now() + time
  const promises = Array.from({ length: maxWorkers }, () => worker())
  await Promise.allSettled(promises)

  if (errors.length === 0) return results
  if (errors.length === 1) throw toError(errors[0])
  throw new AggregateError(
    errors,
    'Multiple errors occurred during concurrent execution'
  )
}
