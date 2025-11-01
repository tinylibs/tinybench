/**
 * @param ms amount of time to sleep in milliseconds
 */
export const sleep = (ms: number): void => {
  const start = performance.now()
  while (performance.now() - start < ms) {
    // noop
  }
}
