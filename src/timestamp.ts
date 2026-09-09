import type { JSRuntime, NowFn, TimestampProvider } from './types'

import { mToMs, mToNs, mToNsBigint, nToMs } from './conversions'
import { assert } from './error'
import { runtime } from './runtime'

/**
 * Returns the current timestamp in milliseconds using `performance.now()`.
 * @returns the current timestamp in milliseconds
 */
export const performanceNow: NowFn = globalThis.performance.now.bind(
  globalThis.performance
)

/**
 * The performance.now() based TimestampProvider.
 */
export const performanceNowTimestampProvider: TimestampProvider = {
  fn: performanceNow,
  fromMs: mToMs,
  name: 'performanceNow',
  toMs: mToMs,
}

/* eslint-disable jsdoc/require-returns-check */
/**
 * Returns the current timestamp in nanoseconds using `process.hrtime.bigint()`.
 * @returns the current timestamp in nanoseconds
 */
const hrtimeBigint =
  globalThis.process?.hrtime?.bigint.bind(globalThis.process?.hrtime) ?? // eslint-disable-line @typescript-eslint/no-unnecessary-condition
  (() => {
    throw new Error('hrtime.bigint() is not supported in this JS environment')
  })
/* eslint-enable jsdoc/require-returns-check */

/**
 * Returns the current timestamp in milliseconds using `process.hrtime.bigint()`.
 *
 * Narrows the absolute nanosecond value to a `number`, which loses precision
 * once it exceeds `Number.MAX_SAFE_INTEGER` (~104 days of uptime). For
 * benchmarking prefer `hrtimeNowTimestampProvider`, which keeps the bigint
 * until after the delta is taken.
 * @returns the current timestamp in milliseconds
 */
export const hrtimeNow = () => nToMs(hrtimeBigint())

/**
 * The hrtime.bigint() based TimestampProvider.
 */
export const hrtimeNowTimestampProvider: TimestampProvider = {
  fn: hrtimeBigint,
  fromMs: mToNsBigint,
  name: 'hrtimeNow',
  toMs: nToMs,
}

/**
 * Returns the current timestamp in nanoseconds using `Bun.nanoseconds()`.
 * @returns the current timestamp in nanoseconds
 */
export const bunNanoseconds = (globalThis as { Bun?: { nanoseconds: NowFn } })
  .Bun?.nanoseconds

/**
 * The Bun.nanoseconds() based TimestampProvider, or undefined if Bun is not available.
 */
export const bunNanosecondsTimestampProvider: TimestampProvider | undefined =
  bunNanoseconds
    ? {
        fn: bunNanoseconds,
        fromMs: mToNs,
        name: 'bunNanoseconds',
        toMs: nToMs,
      }
    : undefined

/**
 * Creates a custom TimestampProvider.
 *
 * Expects the provided function to return time in milliseconds.
 * @param fn - the function to create a TimestampProvider for
 * @returns the created TimestampProvider
 */
export function createCustomTimestampProvider (fn: NowFn): TimestampProvider {
  return {
    fn,
    fromMs: mToMs,
    name: 'custom',
    toMs: mToMs,
  }
}

export const getTimestampProviderByJSRuntime = (
  jsRuntime: JSRuntime = runtime
): TimestampProvider => {
  if (jsRuntime === 'bun') {
    return bunNanosecondsTimestampProvider! // eslint-disable-line @typescript-eslint/no-non-null-assertion
  }
  if (jsRuntime === 'deno') {
    return performanceNowTimestampProvider
  }
  if (jsRuntime === 'node') {
    return hrtimeNowTimestampProvider
  }
  return performanceNowTimestampProvider
}

export const getTimestampProvider = (value: unknown): TimestampProvider => {
  switch (typeof value) {
    case 'function':
      return createCustomTimestampProvider(value as NowFn)
    case 'string':
      switch (value) {
        case 'auto':
          return getTimestampProviderByJSRuntime()
        case 'bunNanoseconds':
          return (
            bunNanosecondsTimestampProvider ?? performanceNowTimestampProvider
          )
        case 'hrtimeNow':
          return hrtimeNowTimestampProvider
        default:
          return performanceNowTimestampProvider
      }
    case 'object':
      if (value === null) {
        return performanceNowTimestampProvider
      }
      assert(
        isValidTimestampProvider(value),
        'Invalid Timestamp Provider object'
      )
      return value as TimestampProvider
    case 'undefined':
      return performanceNowTimestampProvider
    default:
      throw new Error("Invalid value for 'timestampProvider' or 'now'")
  }
}

/**
 * Checks whether a value is a valid TimestampProvider.
 * @param value - value to check
 * @returns whether the value is a valid TimestampProvider
 */
function isValidTimestampProvider (value: unknown): value is TimestampProvider {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as TimestampProvider).fn === 'function' &&
    typeof (value as TimestampProvider).name === 'string' &&
    typeof (value as TimestampProvider).toMs === 'function' &&
    typeof (value as TimestampProvider).fromMs === 'function'
  )
}
