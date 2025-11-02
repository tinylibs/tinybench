// Portions copyright evanwashere. 2024. All Rights Reserved.
// Portions copyright QuiiBz. 2023-2024. All Rights Reserved.

import type { Task } from './task'
import type { ConsoleTableConverter, Fn, Statistics } from './types'

import { emptyFunction, tTable } from './constants'

/**
 * The JavaScript runtime environment.
 * @see https://runtime-keys.proposal.wintercg.org/
 */
export type JSRuntime =
  | 'browser'
  | 'bun'
  | 'deno'
  | 'edge-light'
  | 'fastly'
  | 'hermes'
  | 'jsc'
  | 'lagon'
  | 'moddable'
  | 'netlify'
  | 'node'
  | 'quickjs-ng'
  | 'spidermonkey'
  | 'unknown'
  | 'v8'
  | 'workerd'

/**
 * @param g GlobalThis object
 * @returns Detected runtime and its version
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
      (g.process as { versions: { node: string } }).versions.node || 'unknown'
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
    g.navigator.userAgent.toLowerCase().includes('quickjs-ng')
  ) {
    runtime = 'quickjs-ng'
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
 * @param g GlobalThis object
 * @returns Whether the global object has a navigator with userAgent
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
 * @param value number to format
 * @param significantDigits number of significant digits in the output to aim for
 * @param maxFractionDigits hard limit for the number of digits after the decimal dot
 * @returns formatted number
 */
export const formatNumber = (
  value: number,
  significantDigits: number,
  maxFractionDigits: number
): string => {
  if (typeof value !== 'number') return String(value)

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
  const integerDigits = absValue >= 1 ? Math.floor(Math.log10(absValue)) + 1 : 0
  let decimals = Math.max(0, significantDigits - integerDigits)
  decimals = Math.min(decimals, maxFractionDigits)

  return value.toFixed(decimals)
}

let hrtimeBigint: () => bigint
if (
  typeof (globalThis as { process?: { hrtime?: { bigint: () => bigint } } })
    .process?.hrtime?.bigint === 'function'
) {
  hrtimeBigint = (
    globalThis as unknown as { process: { hrtime: { bigint: () => bigint } } }
  ).process.hrtime.bigint.bind(
    (globalThis as unknown as { process: { hrtime: { bigint: () => bigint } } })
      .process.hrtime
  )
} else {
  hrtimeBigint = () => {
    throw new Error('hrtime.bigint() is not supported in this JS environment')
  }
}
/**
 * Returns the current high resolution timestamp in milliseconds using `process.hrtime.bigint()`.
 * @returns the current high resolution timestamp in milliseconds
 */
export const hrtimeNow = () => nToMs(Number(hrtimeBigint()))

const performanceNow = performance.now.bind(performance)
export const now = performanceNow

/**
 * Checks if a value is a promise-like object.
 * @param maybePromiseLike - the value to check
 * @returns true if the value is a promise-like object
 */
export const isPromiseLike = <T>(
  maybePromiseLike: unknown
): maybePromiseLike is PromiseLike<T> =>
    maybePromiseLike !== null &&
  (typeof maybePromiseLike === 'object' ||
    typeof maybePromiseLike === 'function') &&
  typeof (maybePromiseLike as PromiseLike<T>).then === 'function'

type AsyncFunctionType<A extends unknown[], R> = (...args: A) => PromiseLike<R>

// eslint-disable-next-line @typescript-eslint/no-empty-function
const AsyncFunctionConstructor = (async () => {})
  .constructor as FunctionConstructor

/**
 * An async function check helper only considering runtime support async syntax
 * @param fn - the function to check
 * @returns true if the function is an async function
 */
const isAsyncFunction = (
  fn: Fn | null | undefined
): fn is AsyncFunctionType<unknown[], unknown> =>
  typeof fn === 'function' && fn.constructor === AsyncFunctionConstructor

/**
 * An async function check helper considering runtime support async syntax and promise return
 * @param fn - the function to check
 * @returns true if the function is an async function or returns a promise
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
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        (fnCall as Promise<unknown>).then(emptyFunction)?.catch(emptyFunction)
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
 * Computes the average of a sample.
 * @param samples - the sample
 * @returns the average of the sample
 */
const average = (samples: Samples) => {
  let result = 0

  for (const sample of samples) {
    result += sample
  }

  return result / samples.length
}

/**
 * A type representing a samples-array with at least one number.
 */
export type Samples = [number, ...number[]]

export type SortedSamples = Samples & { readonly __sorted__: unique symbol }

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
 * Sorts samples and returns a new sorted array.
 * @param samples - samples to sort
 * @returns new sorted samples
 */
export const toSortedSamples = (samples: Samples): SortedSamples =>
  [...samples].sort(sortFn) as SortedSamples

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
 * Computes the variance of a sample with Bessel's correction.
 * @param samples - the sample
 * @param avg - the average of the sample
 * @returns the variance of the sample
 */
const variance = (samples: Samples, avg = average(samples)) => {
  if (samples.length === 1) {
    return 0
  }
  let sumSq = 0
  for (const sample of samples) {
    sumSq += (sample - avg) ** 2
  }
  return sumSq / (samples.length - 1)
}

type Quantile = 0.5 | 0.75 | 0.99 | 0.995 | 0.999

/**
 * Computes the q-quantile of a sorted sample.
 * @param samples - the sorted sample
 * @param q - the quantile to compute
 * @returns the q-quantile of the sample
 */
const quantileSorted = (samples: SortedSamples, q: Quantile): number => {
  const base = (samples.length - 1) * q
  const baseIndex = Math.floor(base)

  if (baseIndex + 1 < samples.length) {
    const current = samples[baseIndex]
    const next = samples[baseIndex + 1]
    if (current !== undefined && next !== undefined) {
      return current + (base - baseIndex) * (next - current)
    }
  }
  const sample = samples[baseIndex]
  return sample ?? Number.NaN
}

/**
 * Computes the median of a sorted sample.
 * @param samples - the sorted sample
 * @returns the median of the sample
 */
const medianSorted = (samples: SortedSamples) => quantileSorted(samples, 0.5)

/**
 * A sort function to be passed to Array.prototype.sort for numbers.
 * @param a - first number
 * @param b - second number
 * @returns a number indicating the sort order
 */
export const sortFn = (a: number, b: number) => a - b

/**
 * Computes the median of an unsorted sample.
 * @param samples - the sample
 * @returns the median of the sample
 */
const median = (samples: Samples) => medianSorted(toSortedSamples(samples))

/**
 * Computes the absolute deviation of a sample given an aggregation.
 * @param samples - the sample
 * @param aggFn - the aggregation function to use
 * @param aggValue - the aggregated value to use
 * @returns the absolute deviation of the sample given the aggregation
 */
const absoluteDeviation = <S extends Samples = Samples>(
  samples: S,
  aggFn: (arr: S) => number,
  aggValue = aggFn(samples)
) => {
  const absoluteDeviations: S = [] as unknown as S

  for (const sample of samples) {
    absoluteDeviations.push(Math.abs(sample - aggValue))
  }

  return aggFn(absoluteDeviations)
}

/**
 * Computes the statistics of a sample.
 * The sample must be sorted.
 * @param samples - the sorted sample
 * @returns the statistics of the sample
 */
export const getStatisticsSorted = (samples: SortedSamples): Statistics => {
  const mean = average(samples)
  const vr = variance(samples, mean)
  const sd = Math.sqrt(vr)
  const sem = sd / Math.sqrt(samples.length)
  const df = samples.length - 1
  const critical = tTable[df || 1] ?? tTable[0]
  const moe = sem * critical
  const absMean = Math.abs(mean)
  const rme = absMean === 0 ? Number.POSITIVE_INFINITY : (moe / absMean) * 100
  const p50 = medianSorted(samples)

  return {
    aad: absoluteDeviation(samples, average, mean),
    critical,
    df,
    mad: absoluteDeviation(samples, median, p50),
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
    samples,
    sd,
    sem,
    variance: vr,
  }
}

export const invariant = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(message)
  }
}

/**
 * If we are in a vm context (e.g. jest), instanceof Error checks may fail
 * @param value - value to check
 * @returns whether the value is error-like
 */
function isErrorLike (value: unknown): value is Error {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { message?: unknown }).message === 'string'
  )
}

/**
 * Thrown errors can be of any type. This function converts any value to an Error object.
 * @param value - value to convert to Error
 * @returns the converted Error
 */
export const toError = (value: unknown): Error => {
  switch (typeof value) {
    case 'bigint':
    case 'boolean':
    case 'number':
      return new Error(value.toString())
    case 'function':
      return new Error(value.name)
    case 'object':
      if (value === null) {
        return new Error()
      }
      if (value instanceof Error) {
        return value
      }
      if (isErrorLike(value)) {
        return value
      }
      return new Error()
    case 'string':
      return new Error(value)
    case 'symbol':
      return new Error(value.toString())
    case 'undefined':
      return new Error()
  }
}

const toAverage = (statistics: Statistics): string =>
  `${formatNumber(mToNs(statistics.mean), 5, 2)} \xb1 ${statistics.rme.toFixed(2)}%`
const toMedian = (statistics: Statistics): string =>
  `${formatNumber(mToNs(statistics.p50), 5, 2)} \xb1 ${formatNumber(mToNs(statistics.mad), 5, 2)}`

export const defaultConvertTaskResultForConsoleTable: ConsoleTableConverter = (
  task: Task
): Record<string, number | string> => {
  const state = task.result.state
  return {
    'Task name': task.name,
    ...(state === 'aborted-with-statistics' || state === 'completed'
      ? {
          'Latency avg (ns)': toAverage(task.result.latency),
          'Latency med (ns)': toMedian(task.result.latency),
          Samples: task.result.latency.samples.length,
          'Throughput avg (ops/s)': toAverage(task.result.throughput),
          'Throughput med (ops/s)': toMedian(task.result.throughput),
        }
      : state !== 'errored'
        ? {
            'Latency avg (ns)': 'N/A',
            'Latency med (ns)': 'N/A',
            Remarks: state,
            Samples: 'N/A',
            'Throughput avg (ops/s)': 'N/A',
            'Throughput med (ops/s)': 'N/A',
          }
        : {
            Error: task.result.error.message,
            Stack: task.result.error.stack ?? 'N/A',
          }),
    ...(state === 'aborted-with-statistics' && {
      Remarks: state,
    }),
  }
}

/**
 * Creates a concurrency limiter that can execute functions with a maximum concurrency limit.
 * @param limit - Maximum number of concurrent executions
 * @returns A function that accepts a function to execute and returns a promise
 */
export const pLimit = (limit: number) => {
  const queue: {
    fn: () => Promise<unknown>
    reject: (error: unknown) => void
    resolve: (value: unknown) => void
  }[] = []

  let activeCount = 0
  let pendingCount = 0

  const processNext = async (): Promise<void> => {
    if (activeCount >= limit || queue.length === 0) {
      return
    }

    const item = queue.shift()
    if (item == null) {
      return
    }
    activeCount++
    pendingCount--

    try {
      const result = await item.fn()
      item.resolve(result)
    } catch (error) {
      item.reject(error)
    } finally {
      activeCount--
      // Process next item in queue if any
      processNext().catch(emptyFunction)
    }
  }

  const limiter = <R>(fn: () => Promise<R>): Promise<R> => {
    return new Promise<R>((resolve, reject) => {
      queue.push({
        fn: fn as () => Promise<unknown>,
        reject,
        resolve: resolve as (value: unknown) => void,
      })
      pendingCount++
      processNext().catch(emptyFunction)
    })
  }

  // Add properties to match p-limit API
  Object.defineProperties(limiter, {
    activeCount: {
      enumerable: true,
      get: () => activeCount,
    },
    pendingCount: {
      enumerable: true,
      get: () => pendingCount,
    },
  })

  return limiter as typeof limiter & {
    readonly activeCount: number
    readonly pendingCount: number
  }
}
