import type { Fn } from './types'

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

/**
 * Suppresses rejections of a promise-like value across its rejection channel,
 * the promise its own `then` call returns, and promise-like values it settles
 * with, so none surfaces as an unhandled rejection. Only raw handlers are
 * attached, never assimilated, so handling is realm-agnostic and bounded:
 * every value is attached at most once per probe, so a value reachable
 * through several channels costs a single attach, and settled values and
 * returned promises are followed with a budget of `depth` levels only, which
 * ends rejection and fulfillment cycles of any shape and keeps a self-nesting
 * thenable from generating work endlessly. A thenable that keeps settling new
 * values on persistent handlers can still keep making work on its own; no
 * probe can detach from it.
 * @param value - the promise-like value to mark handled
 * @param depth - the remaining budget for following settled values
 * @param seen - values already attached to by this probe
 */
export const markHandled = (
  value: unknown,
  depth = 2,
  seen: WeakSet<object> = new WeakSet()
): void => {
  try {
    if (!isPromiseLike(value) || seen.has(value)) {
      return
    }
    seen.add(value)
    const settle = (settled: unknown): void => {
      if (depth >= 0) {
        markHandled(settled, depth - 1, seen)
      }
    }
    const returned = value.then(settle, settle)
    if (depth >= 0) {
      markHandled(returned, depth - 1, seen)
    }
  } catch {
    // Treat a throwing `then` as handled
  }
}

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
      markHandled(fnCall)
    }
    return promiseLike
  } catch {
    return false
  }
}
