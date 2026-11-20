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
 * Suppresses rejections of a settled value when it is a native promise,
 * attaching bounded one-step handlers instead of ever assimilating a user
 * thenable, whose own nesting cannot be bounded from the outside.
 * @param value - the settled value to suppress, when a native promise
 */
const terminalSettled = (value: unknown): void => {
  if (value instanceof Promise) {
    value.then(terminalSettled).catch(terminalSettled)
  }
}

/**
 * Marks a settled value handled at one nesting level. Extracted so handlers
 * are passed by reference instead of inline.
 * @param depth - the remaining nesting depth to handle
 * @returns a handler marking its settled value handled
 */
const markSettled =
  (depth: number) =>
    (value: unknown): void => {
      markHandled(value, depth)
    }

/**
 * Suppresses rejections of a promise-like value across its rejection channel,
 * the promise its own `then` call returns, and promise-like values it settles
 * with, so none surfaces as an unhandled rejection. Only raw handlers are
 * attached, never assimilated: nesting is followed for `depth` levels and a
 * terminal value only gets one-step native suppression, so a self-nesting
 * thenable cannot generate work endlessly. A thenable that keeps settling new
 * values on persistent handlers can still keep making work on its own; no
 * probe can detach from it.
 * @param value - the promise-like value to mark handled
 * @param depth - the remaining nesting depth to handle
 */
export const markHandled = (value: unknown, depth = 2): void => {
  try {
    if (!isPromiseLike(value)) {
      return
    }
    if (depth <= 0) {
      terminalSettled(
        (value).then(terminalSettled, terminalSettled)
      )
      return
    }
    const settle = markSettled(depth - 1)
    markHandled(
      (value).then(settle, settle),
      depth - 1
    )
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
