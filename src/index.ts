export { Bench } from './bench'
export { Task } from './task'
export type {
  BenchEvent,
  BenchEvents,
  BenchOptions,
  EventListener,
  Fn,
  FnHook,
  FnOptions,
  FnReturnedObject,
  Hook,
  JSRuntime,
  ResolvedBenchOptions,
  Statistics,
  TaskEvents,
  TaskResult,
} from './types'
export {
  bunNanoseconds,
  hrtimeNow,
  /** @deprecated Use 'performanceNow' instead */
  performanceNow as now,
  nToMs,
  performanceNow,
} from './utils'
