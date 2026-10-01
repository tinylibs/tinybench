/**
 * The default task time budget in milliseconds; see BenchOptions.time.
 */
export const defaultMinimumTime = 1000

/**
 * The default task iteration limit; see BenchOptions.iterations.
 */
export const defaultMinimumIterations = 64

/**
 * The default warmup time budget in milliseconds; see BenchOptions.warmupTime.
 */
export const defaultMinimumWarmupTime = 250

/**
 * The default warmup iteration limit; see BenchOptions.warmupIterations.
 */
export const defaultMinimumWarmupIterations = 16

/**
 * An empty function used as a default no-op callback.
 */
export const emptyFunction = Object.freeze(() => {
  /* no op */
})
