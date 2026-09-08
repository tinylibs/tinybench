// Portions copyright evanwashere. 2024. All Rights Reserved.
// Portions copyright QuiiBz. 2023-2024. All Rights Reserved.

import type { Fn } from './types'

import { emptyFunction } from './constants'

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
