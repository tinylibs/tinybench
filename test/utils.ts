const nil32 = typeof SharedArrayBuffer !== 'undefined' && typeof Atomics !== 'undefined' && new Int32Array(new SharedArrayBuffer(4))

/**
 * Synchronously blocks the event loop for the specified number of milliseconds.
 * This is a busy-wait sleep function (not async, not Promise-based).
 * Use only in test or non-production code.
 * @param ms amount of time to sleep in milliseconds
 */
export const sleep = nil32 !== false
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
