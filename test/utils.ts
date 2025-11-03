/**
 * Synchronously blocks the event loop for the specified number of milliseconds.
 * This is a busy-wait sleep function (not async, not Promise-based).
 * Use only in test or non-production code.
 * @param ms amount of time to sleep in milliseconds
 */
export const sleep = (ms: number): void => {
  const start = performance.now()
  while (performance.now() - start < ms) {
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
