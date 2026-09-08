// Portions copyright evanwashere. 2024. All Rights Reserved.
// Portions copyright QuiiBz. 2023-2024. All Rights Reserved.

export { isFnAsyncResource, isPromiseLike } from './async'
export { withConcurrency } from './concurrency'
export { defaultConvertTaskResultForConsoleTable } from './console-table'
export { mToMs, mToNs, mToNsBigint, nBigintToMs, nToMs } from './conversions'
export { assert, toError } from './error'
export { formatNumber } from './format'
export { detectRuntime, runtime, runtimeVersion } from './runtime'
export {
  absoluteDeviationMean,
  absoluteDeviationMedian,
  computeStatistics,
  isValidSamples,
  meanAndVariance,
  medianAbsoluteDeviation,
  sortFn,
  sortSamples,
} from './statistics'
export type {
  CalibrateTimerOverheadOptions,
  TimerOverheadEstimatorKind,
} from './timer-diagnostics'
export {
  calibrateTimerOverhead,
  classifyTimerSaturation,
  detectTimerSaturation,
  estimateResolution,
} from './timer-diagnostics'
export {
  bunNanoseconds,
  bunNanosecondsTimestampProvider,
  createCustomTimestampProvider,
  getTimestampProvider,
  getTimestampProviderByJSRuntime,
  hrtimeNow,
  hrtimeNowTimestampProvider,
  performanceNow,
  performanceNowTimestampProvider,
} from './timestamp'
