import type { Task } from '../src/task'
import type { JSRuntime } from './utils'

export type AddEventListenerOptionsArgument = Parameters<
  typeof EventTarget.prototype.addEventListener
>[2]

/**
 * Bench event
 */
export type BenchEvent = Event & { error?: Error; task?: Task }

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
 * Both the `Task` and `Bench` objects extend the `EventTarget` object.
 * So you can attach a listeners to different types of events to each class instance
 * using the universal `addEventListener` and `removeEventListener` methods.
 */

/**
 * Bench options
 */
export interface BenchOptions {
  /**
   * number of times that a task should run if even the time option is finished
   * @default 64
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
   * Throws if a task fails
   * @default false
   */
  throws?: boolean

  /**
   * time needed for running a benchmark task (milliseconds)
   * @default 1000
   */
  time?: number

  /**
   * warmup benchmark
   * @default true
   */
  warmup?: boolean

  /**
   * warmup iterations
   * @default 16
   */
  warmupIterations?: number

  /**
   * warmup time (milliseconds)
   * @default 250
   */
  warmupTime?: number
}

export type ConsoleTableConverter = (
  task: Task
) => Record<string, number | string>

/**
 * Event listener
 */
export type EventListener = (evt: BenchEvent) => void

/**
 * The task function.
 *
 * If you need to provide a custom duration for the task (e.g.: because
 * you want to measure a specific part of its execution), you can return an
 * object with a `overriddenDuration` field. You should still use
 * `bench.opts.now()` to measure that duration.
 */
export type Fn = () =>
  | FnReturnedObject
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  | Promise<FnReturnedObject | unknown>
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  | unknown

/**
 * The task hook function signature.
 * If warmup is enabled, the hook will be called twice, once for the warmup and once for the run.
 * @param mode the mode where the hook is being called
 */
export type FnHook = (
  this: Task,
  mode?: 'run' | 'warmup'
) => Promise<void> | void

/**
 * The task function options
 */
export interface FnOptions {
  /**
   * An optional function that is run after all iterations of this task end
   */
  afterAll?: FnHook

  /**
   * An optional function that is run after each iteration of this task
   */
  afterEach?: FnHook

  /**
   * Whether the provided task function is asynchronous, otherwise it is
   * determined automatically.
   */
  async?: boolean

  /**
   * An optional function that is run before iterations of this task begin
   */
  beforeAll?: FnHook

  /**
   * An optional function that is run before each iteration of this task
   */
  beforeEach?: FnHook

  /**
   * An AbortSignal for aborting this specific task
   *
   * If not provided, falls back to {@link BenchOptions.signal}
   */
  signal?: AbortSignal
}

/**
 * A possible object returned by task functions to override default behaviors,
 * like the duration of the function itself.
 */
export interface FnReturnedObject {
  /**
   * An overridden duration for the task function, to be used instead of the
   * duration measured by tinybench when running the benchmark.
   *
   * This can be useful to measure parts of the execution of a function that are
   * hard to execute independently.
   */
  overriddenDuration?: number
}

/**
 * The hook function signature.
 * If warmup is enabled, the hook will be called twice, once for the warmup and once for the run.
 * @param task the task instance
 * @param mode the mode where the hook is being called
 */
export type Hook = (
  task?: Task,
  mode?: 'run' | 'warmup'
) => Promise<void> | void

/**
 * P-limit instance interface for concurrency control
 */
export interface PLimitInstance {
  /**
   * Executes a function with concurrency limiting
   * @param fn Function to execute
   * @returns Promise resolving to the function's result
   */
  <R>(fn: () => Promise<R>): Promise<R>

  /**
   * Number of currently active (running) operations
   */
  readonly activeCount: number

  /**
   * Number of operations waiting in the queue
   */
  readonly pendingCount: number
}

// @types/node doesn't have these types globally, and we don't want to bring "dom" lib for everyone
export type RemoveEventListenerOptionsArgument = Parameters<
  typeof EventTarget.prototype.removeEventListener
>[2]

export interface ResolvedBenchOptions extends BenchOptions {
  iterations: NonNullable<BenchOptions['iterations']>
  now: NonNullable<BenchOptions['now']>
  setup: NonNullable<BenchOptions['setup']>
  teardown: NonNullable<BenchOptions['teardown']>
  throws: NonNullable<BenchOptions['throws']>
  time: NonNullable<BenchOptions['time']>
  warmup: NonNullable<BenchOptions['warmup']>
  warmupIterations: NonNullable<BenchOptions['warmupIterations']>
  warmupTime: NonNullable<BenchOptions['warmupTime']>
}

/**
 * The statistics object
 */
export interface Statistics {
  /**
   * mean/average absolute deviation
   */
  aad: number

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
  mad: number

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
  p50: number

  /**
   * p75 percentile
   */
  p75: number

  /**
   * p99 percentile
   */
  p99: number

  /**
   * p995 percentile
   */
  p995: number

  /**
   * p999 percentile
   */
  p999: number

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
 * Task events
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
 * The task result object
 */
export type TaskResult =
  | TaskResultAborted
  | TaskResultAbortedWithStatistics
  | TaskResultCompleted
  | TaskResultErrored
  | TaskResultNotStarted
  | TaskResultStarted

export interface TaskResultAborted {
  /**
   * whether the task was aborted
   */
  aborted: true

  state: 'aborted'
}

export interface TaskResultAbortedWithStatistics
  extends TaskResultWithStatistics {
  /**
   * whether the task was aborted
   */
  aborted: true

  state: 'aborted-with-statistics'
}

export interface TaskResultCompleted extends TaskResultWithStatistics {
  /**
   * whether the task was aborted
   */
  aborted: false

  /**
   * how long each operation takes (ms)
   */
  period: number

  state: 'completed'
}

export interface TaskResultErrored {
  /**
   * the error that caused the task to fail
   */
  error: Error

  state: 'errored'
}

export interface TaskResultNotStarted {
  state: 'not-started'
}

export interface TaskResultRuntimeInfo {
  /**
   * the JavaScript runtime environment
   */
  runtime: JSRuntime

  /**
   * the JavaScript runtime version
   */
  runtimeVersion: string
}

export interface TaskResultStarted {
  state: 'started'
}

export interface TaskResultWithStatistics extends DeprecatedStatistics {
  /**
   * the task latency statistics
   */
  latency: Statistics

  /**
   * how long each operation takes (ms)
   */
  period: number

  /**
   * the task throughput statistics
   */
  throughput: Statistics

  /**
   * the time to run the task benchmark cycle (ms)
   */
  totalTime: number
}

interface DeprecatedStatistics {
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
   * the number of operations per second
   * @deprecated use `.throughput.mean` instead
   */
  hz: number

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
   * the latency samples relative margin of error
   * @deprecated use `.latency.rme` instead
   */
  rme: number

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
   * the latency samples variance
   * @deprecated use `.latency.variance` instead
   */
  variance: number
}
