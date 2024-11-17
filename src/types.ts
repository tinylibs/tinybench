import type { Task } from '../src/task'
import type { JSRuntime } from './utils'

/**
 * the task function
 */
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export type Fn = () => Promise<unknown> | unknown

/**
 * the task function options
 */
export interface FnOptions {
  /**
   * An optional function that is run after all iterations of this task end
   */
  afterAll?: (this: Task) => Promise<void> | void

  /**
   * An optional function that is run after each iteration of this task
   */
  afterEach?: (this: Task) => Promise<void> | void

  /**
   * An optional function that is run before iterations of this task begin
   */
  beforeAll?: (this: Task) => Promise<void> | void

  /**
   * An optional function that is run before each iteration of this task
   */
  beforeEach?: (this: Task) => Promise<void> | void
}

/**
 * the statistics object
 */
export interface Statistics {
  /**
   * mean/average absolute deviation
   */
  aad: number | undefined

  /**
   * critical value
   */
  critical: number

  /**
   * degrees of freedom
   */
  df: number

  /**
   * median absolute deviation
   */
  mad: number | undefined

  /**
   * the maximum value
   */
  max: number

  /**
   * mean/average
   */
  mean: number

  /**
   * the minimum value
   */
  min: number

  /**
   * margin of error
   */
  moe: number

  /**
   * p50/median percentile
   */
  p50: number | undefined

  /**
   * p75 percentile
   */
  p75: number | undefined

  /**
   * p99 percentile
   */
  p99: number | undefined

  /**
   * p995 percentile
   */
  p995: number | undefined

  /**
   * p999 percentile
   */
  p999: number | undefined

  /**
   * relative margin of error
   */
  rme: number

  /**
   * samples
   */
  samples: number[]

  /**
   * standard deviation
   */
  sd: number

  /**
   * standard error of the mean/average (a.k.a. the standard deviation of the distribution of the sample mean/average)
   */
  sem: number

  /**
   * variance
   */
  variance: number
}

/**
 * the task result object
 */
export interface TaskResult {
  /**
   * the latency samples critical value
   * @deprecated use `.latency.critical` instead
   */
  critical: number

  /**
   * the latency samples degrees of freedom
   * @deprecated use `.latency.df` instead
   */
  df: number

  /**
   * the last task error that was thrown
   */
  error?: Error

  /**
   * the number of operations per second
   * @deprecated use `.throughput.mean` instead
   */
  hz: number

  /**
   * the task latency statistics
   */
  latency: Statistics

  /**
   * the maximum latency samples value
   * @deprecated use `.latency.max` instead
   */
  max: number

  /**
   * the latency samples mean/average
   * @deprecated use `.latency.mean` instead
   */
  mean: number

  /**
   * the minimum latency samples value
   * @deprecated use `.latency.min` instead
   */
  min: number

  /**
   * the latency samples margin of error
   * @deprecated use `.latency.moe` instead
   */
  moe: number

  /**
   * the latency samples p75 percentile
   * @deprecated use `.latency.p75` instead
   */
  p75: number

  /**
   * the latency samples p99 percentile
   * @deprecated use `.latency.p99` instead
   */
  p99: number

  /**
   * the latency samples p995 percentile
   * @deprecated use `.latency.p995` instead
   */
  p995: number

  /**
   * the latency samples p999 percentile
   * @deprecated use `.latency.p999` instead
   */
  p999: number

  /**
   * how long each operation takes (ms)
   */
  period: number

  /**
   * the latency samples relative margin of error
   * @deprecated use `.latency.rme` instead
   */
  rme: number

  /**
   * the JavaScript runtime environment
   */
  runtime: 'unknown' | JSRuntime

  /**
   * the JavaScript runtime version
   */
  runtimeVersion: string

  /**
   * latency samples (ms)
   * @deprecated use `.latency.samples` instead
   */
  samples: number[]

  /**
   * the latency samples standard deviation
   * @deprecated use `.latency.sd` instead
   */
  sd: number

  /**
   * the latency standard error of the mean (a.k.a. the standard deviation of the distribution of the sample mean/average)
   * @deprecated use `.latency.sem` instead
   */
  sem: number

  /**
   * the task throughput statistics
   */
  throughput: Statistics

  /**
   * the time to run the task benchmark cycle (ms)
   */
  totalTime: number

  /**
   * the latency samples variance
   * @deprecated use `.latency.variance` instead
   */
  variance: number
}

/**
 * Both the `Task` and `Bench` objects extend the `EventTarget` object.
 * So you can attach a listeners to different types of events to each class instance
 * using the universal `addEventListener` and `removeEventListener` methods.
 */

/**
 * Bench events
 */
export type BenchEvents =
  | 'abort' // when a signal aborts
  | 'add' // when a task gets added to the Bench instance
  | 'complete' // when running a benchmark finishes
  | 'cycle' // when running each benchmark task gets done
  | 'error' // when the benchmark task throws
  | 'remove' // when a task gets removed of the Bench instance
  | 'reset' // when the reset method gets called
  | 'start' // when running the benchmarks gets started
  | 'warmup' // when the benchmarks start getting warmed up

export type Hook = (task: Task, mode: 'run' | 'warmup') => Promise<void> | void

/**
 * bench event
 */
export type BenchEvent = { error?: Error; task?: Task } & Event

/**
 * event listener
 */
export type EventListener = (evt: BenchEvent) => void

export interface BenchEventsMap {
  abort: EventListener
  add: EventListener
  complete: EventListener
  cycle: EventListener
  error: EventListener
  remove: EventListener
  reset: EventListener
  start: EventListener
  warmup: EventListener
}

/**
 * task events
 */
export type TaskEvents =
  | 'abort'
  | 'complete'
  | 'cycle'
  | 'error'
  | 'reset'
  | 'start'
  | 'warmup'

export interface TaskEventsMap {
  abort: EventListener
  complete: EventListener
  cycle: EventListener
  error: EventListener
  reset: EventListener
  start: EventListener
  warmup: EventListener
}

/**
 * bench options
 */
export interface BenchOptions {
  /**
   * number of times that a task should run if even the time option is finished @default 64
   */
  iterations?: number

  /**
   * benchmark name
   */
  name?: string

  /**
   * function to get the current timestamp in milliseconds
   */
  now?: () => number

  /**
   * setup function to run before each benchmark task (cycle)
   */
  setup?: Hook

  /**
   * An AbortSignal for aborting the benchmark
   */
  signal?: AbortSignal

  /**
   * teardown function to run after each benchmark task (cycle)
   */
  teardown?: Hook

  /**
   * Throws if a task fails @default false
   */
  throws?: boolean

  /**
   * time needed for running a benchmark task (milliseconds) @default 1000
   */
  time?: number

  /**
   * warmup benchmark @default true
   */
  warmup?: boolean

  /**
   * warmup iterations @default 16
   */
  warmupIterations?: number

  /**
   * warmup time (milliseconds) @default 250
   */
  warmupTime?: number
}

// @types/node doesn't have these types globally, and we don't want to bring "dom" lib for everyone
export type RemoveEventListenerOptionsArgument = Parameters<
  typeof EventTarget.prototype.removeEventListener
>[2]
export type AddEventListenerOptionsArgument = Parameters<
  typeof EventTarget.prototype.addEventListener
>[2]
