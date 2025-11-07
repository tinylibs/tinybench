const nil = typeof SharedArrayBuffer !== 'undefined' && typeof Atomics !== 'undefined' && new Int32Array(new SharedArrayBuffer(4))

/**
 * Synchronously blocks the event loop for the specified number of milliseconds.
 * This is a busy-wait sleep function (not async, not Promise-based).
 * Use only in test or non-production code.
 * @param ms amount of time to sleep in milliseconds
 */
export const sleep = nil !== false
  ? (ms: number): void => {
      Atomics.wait(nil, 0, 0, ms)
    }
  : (ms: number): void => {
      const start = performance.now()
      while (performance.now() - start < ms) {
      // noop
      }
    }
