// Portions copyright evanwashere. 2024. All Rights Reserved.
// eslint-disable-next-line @cspell/spellchecker
// Portions copyright QuiiBz. 2023-2024. All Rights Reserved.

import type { Fn, Statistics } from './types'

import { emptyFunction, tTable } from './constants'

/**
 * The JavaScript runtime environment.
 * @see https://runtime-keys.proposal.wintercg.org/
 */
export type JSRuntime =
  'browser' |
  'bun' |
  'deno' |
  'edge-light' |
  'fastly' |
  'hermes' |
  'jsc' |
  'lagon' |
  'moddable' |
  'netlify' |
  'node' |
  'quickjs-ng' |
  'spidermonkey' |
  'unknown' |
  'v8' |
  'workerd'

/**
 * @param g GlobalThis object
 * @returns Detected runtime and its version
 */
export function detectRuntime (g = globalThis as Record<string, unknown>): {
  runtime: JSRuntime
  version: string
} {
  if (!!g.Bun || !!(g.process && (g.process as { versions?: Record<string, string> }).versions?.bun)) {
    return {
      runtime: 'bun',
      version: (g.Bun as { version: string }).version || 'unknown',
    }
  }

  if (g.Deno) {
    return {
      runtime: 'deno',
      version: (g.Deno as { version?: { deno: string } }).version?.deno ?? 'unknown',
    }
  }

  if (g.process) {
    if ((g.process as { release?: { name: string } }).release?.name === 'node') {
      return {
        runtime: 'node',
        version: (g.process as { versions: { node: string } }).versions.node || 'unknown',
      }
    }
  }

  if (g.HermesInternal) {
    return {
      runtime: 'hermes',
      version: (g.HermesInternal as { getRuntimeProperties?: () => Record<string, string> }).getRuntimeProperties?.()[

        'OSS Release Version'
      ] ?? 'unknown',
    }
  }

  if (hasNavigatorWithUserAgent(g)) {
    const userAgent = g.navigator.userAgent
    if (userAgent === 'Cloudflare-Workers') {
      return {
        runtime: 'workerd',
        version: 'unknown',
      }
    }

    if (userAgent.toLowerCase().includes('quickjs-ng')) {
      return {
        runtime: 'quickjs-ng',
        version: 'unknown',
      }
    }
  }

  if (typeof g.Netlify === 'object') {
    return {
      runtime: 'netlify',
      version: 'unknown',
    }
  }

  if (typeof g.EdgeRuntime === 'string') {
    return {
      runtime: 'edge-light',
      version: 'unknown',
    }
  }

  if (g.__lagon__) {
    return {
      runtime: 'lagon',
      version: 'unknown',
    }
  }

  if (g.fastly) {
    return {
      runtime: 'fastly',
      version: 'unknown',
    }
  }

  if (
    !!g.$262 &&
    !!g.lockdown &&
    !!g.AsyncDisposableStack
  ) {
    return {
      runtime: 'moddable',
      version: 'unknown',
    }
  }

  if (g.d8) {
    return {
      runtime: 'v8',
      version: typeof g.version === 'function' ? (g.version as () => string)() : 'unknown',
    }
  }

  if (
    !!g.inIon &&
    !!(g.performance && (g.performance as { mozMemory?: unknown }).mozMemory)
  ) {
    return {
      runtime: 'spidermonkey',
      version: 'unknown',
    }
  }

  if (
    typeof g.$ === 'object' && g.$ !== null &&
    'IsHTMLDDA' in g.$ // eslint-disable-line @cspell/spellchecker
  ) {
    return {
      runtime: 'jsc',
      version: 'unknown',
    }
  }

  if (
    !!g.window &&
    !!g.navigator
  ) {
    return {
      runtime: 'browser',
      version: 'unknown',
    }
  }

  return {
    runtime: 'unknown',
    version: 'unknown',
  }
}

/**
 * @param g GlobalThis object
 * @returns Whether the global object has a navigator with userAgent
 */
function hasNavigatorWithUserAgent (g = globalThis as Record<string, unknown>): g is { navigator: Navigator } {
  return (
    typeof g.navigator === 'object' &&
    g.navigator !== null &&
    typeof (g.navigator as Navigator).userAgent === 'string'
  )
}

export const {
  runtime,
  version: runtimeVersion,
} = detectRuntime()

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
if (typeof (globalThis as any).process?.hrtime?.bigint === 'function') {
  hrtimeBigint = globalThis.process.hrtime.bigint.bind(process.hrtime)
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

/**
 * An async function check helper only considering runtime support async syntax
 * @param fn - the function to check
 * @returns true if the function is an async function
 */
const isAsyncFunction = (
  fn: Fn | null | undefined
): fn is AsyncFunctionType<unknown[], unknown> =>
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  fn?.constructor === (async () => {}).constructor

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
 * @throws {Error} if the sample is empty
 */
const average = (samples: number[]) => {
  if (samples.length === 0) {
    throw new Error('samples must not be empty')
  }
  return samples.reduce((a, b) => a + b, 0) / samples.length || 0
}

/**
 * Computes the variance of a sample with Bessel's correction.
 * @param samples - the sample
 * @param avg - the average of the sample
 * @returns the variance of the sample
 */
const variance = (samples: number[], avg = average(samples)) => {
  if (samples.length <= 1) {
    return 0
  }
  const sumSq = samples.reduce((sum, n) => sum + (n - avg) ** 2, 0)
  return sumSq / (samples.length - 1)
}

/**
 * Computes the q-quantile of a sorted sample.
 * @param samples - the sorted sample
 * @param q - the quantile to compute
 * @returns the q-quantile of the sample
 * @throws {Error} if the sample is empty
 */
const quantileSorted = (samples: number[], q: number) => {
  if (samples.length === 0) {
    throw new Error('samples must not be empty')
  }
  if (q < 0 || q > 1) {
    throw new Error('q must be between 0 and 1')
  }
  if (q === 0) {
    return samples[0]
  }
  if (q === 1) {
    return samples[samples.length - 1]
  }
  const base = (samples.length - 1) * q
  const baseIndex = Math.floor(base)
  if (samples[baseIndex + 1] != null) {
    return (
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      samples[baseIndex]! +
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (base - baseIndex) * (samples[baseIndex + 1]! - samples[baseIndex]!)
    )
  }
  return samples[baseIndex]
}

/**
 * Computes the median of a sorted sample.
 * @param samples - the sorted sample
 * @returns the median of the sample
 */
const medianSorted = (samples: number[]) => quantileSorted(samples, 0.5)

/**
 * Computes the median of a sample.
 * @param samples - the sample
 * @returns the median of the sample
 */
const median = (samples: number[]) => {
  return medianSorted([...samples].sort((a, b) => a - b))
}

/**
 * Computes the absolute deviation of a sample given an aggregation.
 * @param samples - the sample
 * @param aggFn - the aggregation function to use
 * @param aggValue - the aggregated value to use
 * @returns the absolute deviation of the sample given the aggregation
 */
const absoluteDeviation = (
  samples: number[],
  aggFn: (arr: number[]) => number | undefined,
  aggValue = aggFn(samples)
) => {
  const absoluteDeviations: number[] = []

  for (const sample of samples) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    absoluteDeviations.push(Math.abs(sample - aggValue!))
  }

  return aggFn(absoluteDeviations)
}

/**
 * Computes the statistics of a sample.
 * The sample must be sorted.
 * @param samples - the sorted sample
 * @returns the statistics of the sample
 * @throws {Error} if the sample is empty
 */
export const getStatisticsSorted = (samples: number[]): Statistics => {
  const mean = average(samples)
  const vr = variance(samples, mean)
  const sd = Math.sqrt(vr)
  const sem = sd / Math.sqrt(samples.length)
  const df = samples.length - 1
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-non-null-assertion
  const critical = tTable[(Math.round(df) || 1).toString()] || tTable.infinity!
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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    min: samples[0]!,
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
