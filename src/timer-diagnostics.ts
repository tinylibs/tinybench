import type { SortedSamples, TimerSaturationReason, TimestampProvider } from './types'

import { quantileSorted, sortFn } from './statistics'

/**
 * Classifies timer saturation in a latency sample set.
 *
 * Criteria are evaluated in the fixed order `'zero-dominated'` →
 * `'low-distinct'` → `'zero-mad'`; the first match wins. Fewer than 10
 * samples are never classified — with so few measurements the criteria
 * cannot reliably distinguish a deterministic fast function from one truly
 * limited by the timer grain.
 *
 * The distinct-value count is computed in O(n) by exploiting the
 * sorted-ascending invariant of `samples` and short-circuits as soon as
 * the threshold is reached.
 * @param samples - the latency samples, sorted ascending
 * @param mad - the median absolute deviation (e.g. from
 *   `medianAbsoluteDeviation` or `computeStatistics`)
 * @returns the saturation reason, or `undefined` when no criterion fires
 */
export const classifyTimerSaturation = (
  samples: SortedSamples,
  mad: number
): TimerSaturationReason | undefined => {
  const n = samples.length
  if (n < 10) return undefined

  let zeroCount = 0
  for (const s of samples) {
    if (s === 0) zeroCount++
  }
  if (zeroCount * 2 > n) return 'zero-dominated'

  const distinctThreshold = Math.max(3, Math.min(10, Math.floor(n / 1000)))
  let distinctCount = 1
  for (let i = 1; i < n; i++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (samples[i]! !== samples[i - 1]!) {
      distinctCount++
      if (distinctCount >= distinctThreshold) break
    }
  }
  if (distinctCount < distinctThreshold) return 'low-distinct'

  if (n > 100 && mad === 0) return 'zero-mad'

  return undefined
}

/**
 * Detects timer saturation in a latency sample set.
 *
 * Boolean wrapper around {@link classifyTimerSaturation}; prefer the
 * classifier when the specific reason is needed (e.g. to surface it on a
 * `'warning'` event).
 * @param samples - the latency samples, sorted ascending
 * @param mad - the median absolute deviation
 * @returns `true` when a saturation criterion fires, `false` otherwise
 */
export const detectTimerSaturation = (
  samples: SortedSamples,
  mad: number
): boolean => classifyTimerSaturation(samples, mad) !== undefined

/**
 * Estimates the effective timer resolution from a latency sample set.
 *
 * The estimator returns the smallest strictly positive sample value that
 * appears at least twice (the smallest reproducibly observed increment).
 * Requiring two occurrences gives a 2/n breakdown point and avoids being
 * pulled to an artificially low value by a single anomalous sample (cold
 * cache, GC pause, hardware quirk).
 *
 * When no positive value appears more than once (e.g. a continuous
 * sub-microsecond timer with all unique samples), falls back to the strict
 * minimum of the positive values, which is the best available lower bound
 * in that case.
 *
 * Exploits the sorted-ascending invariant: equal values are contiguous, so
 * the first strictly-positive value with an equal successor is the smallest
 * reproduced value, and the first strictly-positive value is the fallback
 * minimum. Runs in O(1) extra space with an early exit.
 * @param samples - the latency samples, sorted ascending
 * @returns the estimated resolution in milliseconds, or `undefined` when no
 *   strictly positive sample is observed
 */
export const estimateResolution = (
  samples: SortedSamples
): number | undefined => {
  let fallbackMin: number | undefined
  for (let i = 0; i < samples.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const v = samples[i]!
    if (v <= 0) continue
    fallbackMin ??= v
    if (samples[i + 1] === v) return v
  }
  return fallbackMin
}

/**
 * Options for {@link calibrateTimerOverhead}.
 */
export interface CalibrateTimerOverheadOptions {
  /**
   * Estimator used to reduce the distribution of strictly-positive
   * back-to-back call deltas to a single overhead value.
   * @default 'median'
   */
  estimator?: TimerOverheadEstimatorKind
  /**
   * Number of back-to-back call pairs to measure during the collection phase.
   * @default 1024
   */
  pairs?: number
  /**
   * Number of discarded warm-up pairs executed before the collection phase,
   * allowing the JIT to reach a steady compilation tier for both
   * `provider.fn` and `provider.toMs`.
   * @default 64
   */
  warmupPairs?: number
}

/**
 * Estimator strategy for {@link calibrateTimerOverhead}.
 *
 * - `'median'` — median of strictly-positive deltas (default). Robust to
 *   occasional OS-scheduling jitter and GC spikes at the cost of a slight
 *   upward bias on noisy hosts.
 * - `'min'` — minimum of strictly-positive deltas. Captures the lowest
 *   observed call cost.
 * - `'p05'` — 5th percentile of strictly-positive deltas. A compromise
 *   between robustness and tightness.
 */
export type TimerOverheadEstimatorKind = 'median' | 'min' | 'p05'

/**
 * Estimates the cost of a single `provider.fn()` call by repeatedly measuring
 * back-to-back pairs and reducing the strictly-positive deltas to a single
 * value via the chosen estimator.
 *
 * **Coarse-timer detection.** When the timer resolution `R` exceeds the call
 * cost `C` (`C < R / 2`), the probability that any pair crosses a tick
 * boundary is `C / R < 1 / 2`, so most pairs return a delta of zero. The
 * positive deltas that do occur each equal exactly one tick `R`, not the
 * call cost. To prevent catastrophic over-correction, the function returns
 * `0` whenever fewer than half of the pairs produce a positive delta.
 *
 * **Bigint precision.** The subtraction is performed in the provider's
 * native type before conversion to milliseconds (`toMs(b - a)`). For
 * `hrtimeNow`, this preserves precision when absolute timestamps exceed
 * `Number.MAX_SAFE_INTEGER` ns (≈ 104 days uptime).
 *
 * **JIT warmup.** A discarded warmup phase ensures `fn` and `toMs` are
 * JIT-compiled to their steady-state tier before measurements begin.
 * @param provider - the timestamp provider to calibrate
 * @param options - calibration options
 * @returns the estimated overhead in milliseconds, never negative; `0` when
 *   the timer resolution dominates or no positive delta is observed
 */
export const calibrateTimerOverhead = (
  provider: TimestampProvider,
  options: CalibrateTimerOverheadOptions = {}
): number => {
  const { estimator = 'median', pairs = 1024, warmupPairs = 64 } = options
  const { fn, toMs } = provider

  // Degenerate or non-finite input: `Number.isInteger` also rejects
  // Infinity/NaN/non-integer counts that would otherwise hang the loop.
  if (!Number.isInteger(pairs) || pairs <= 0) return 0

  // `fn` returns TimestampValue (`bigint | number`); both operands always
  // share a runtime type. Casting both to `bigint` lets the operator
  // typecheck without a type predicate; at runtime the `-` operator is
  // polymorphic for both numeric branches and `toMs` accepts either.
  if (Number.isInteger(warmupPairs) && warmupPairs > 0) {
    for (let i = 0; i < warmupPairs; i++) {
      const a = fn() as bigint
      const b = fn() as bigint
      toMs(b - a)
    }
  }

  const deltas: number[] = []
  for (let i = 0; i < pairs; i++) {
    const a = fn() as bigint
    const b = fn() as bigint
    const delta = toMs(b - a)
    if (delta > 0) deltas.push(delta)
  }

  if (deltas.length * 2 < pairs) return 0

  deltas.sort(sortFn)

  if (estimator === 'min') {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return deltas[0]!
  }
  if (estimator === 'p05') {
    return quantileSorted(deltas as SortedSamples, 0.05)
  }
  const mid = deltas.length >> 1
  if ((deltas.length & 1) === 1) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return deltas[mid]!
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return (deltas[mid - 1]! + deltas[mid]!) / 2
}
