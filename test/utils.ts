import { type Samples, type SortedSamples, sortFn } from '../src/utils'

const nil32 =
  typeof SharedArrayBuffer !== 'undefined' &&
  typeof Atomics !== 'undefined' &&
  new Int32Array(new SharedArrayBuffer(4))

const platform = await (async () => {
  try {
    return await import('node:os').then(mod => mod.platform())
  } catch {
    return 'unknown'
  }
})()

/**
 * Synchronously blocks the event loop for the specified number of milliseconds.
 * This is a busy-wait sleep function (not async, not Promise-based).
 * Use only in test or non-production code.
 * @param ms amount of time to sleep in milliseconds
 */
export const sleep =
  nil32 !== false && platform === 'linux'
    ? (ms: number): void => {
        if (Atomics.wait(nil32, 0, 0, ms) !== 'timed-out') {
          throw new Error('Atomics.wait returned unexpected value')
        }
      }
    : (ms: number): void => {
        const target = performance.now() + ms
        while (target > performance.now()) {
          // noop
        }
      }

/**
 * Asynchronously waits for the specified number of milliseconds without blocking the event loop.
 * Use this for testing asynchronous behavior.
 * @param ms amount of time to wait in milliseconds
 * @returns A Promise that resolves after the specified delay
 */
export const asyncSleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Sorts samples and returns a new sorted array.
 * @param samples - samples to sort
 * @returns new sorted samples
 */
export const toSortedSamples = (samples: Samples): SortedSamples =>
  [...samples].sort(sortFn) as SortedSamples
