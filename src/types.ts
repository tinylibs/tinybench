import type { BenchEvent } from '../src/event'
import type { Task } from '../src/task'

export type { BenchEvent } from '../src/event'

/**
 * Options for adding an event listener
 */
export type AddEventListenerOptionsArgument = Parameters<
  typeof EventTarget.prototype.addEventListener
>[2]

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

/**
 * Bench events that may have an associated Task
 */
export type BenchEventsOptionalTask = Omit<
  BenchEvents,
  'add' | 'cycle' | 'error' | 'remove'
>

/**
 * Bench events that have an associated error
 */
export type BenchEventsWithError = Extract<BenchEvents, 'error'>
/**
 * Bench events that have an associated Task
 */
export type BenchEventsWithTask = Extract<
  BenchEvents,
  'add' | 'cycle' | 'error' | 'remove'
>

/**
 * Used to decouple Bench and Task
 */
export interface BenchLike extends EventTarget {
  /**
   * Adds a listener for the specified event type.
   */
  addEventListener: <K extends BenchEvents>(
    type: K,
    listener: EventListener<K> | EventListenerObject<K> | null,
    options?: AddEventListenerOptionsArgument
  ) => void
  /**
   * Executes tasks concurrently based on the specified concurrency mode, if set.
   *
   * - When `mode` is set to `null` (default), concurrency is disabled.
   * - When `mode` is set to 'task', each task's iterations (calls of a task function) run concurrently.
   * - When `mode` is set to 'bench', different tasks within the bench run concurrently.
   */
  concurrency: Concurrency
  /**
   * The amount of executions per task.
   */
  iterations: number
  /**
   * A function to get a timestamp.
   */
  now: NowFn
  /**
   * Removes a previously registered event listener.
   */
  removeEventListener: <K extends BenchEvents>(
    type: K,
    listener: EventListener<K> | EventListenerObject<K> | null,
    options?: RemoveEventListenerOptionsArgument
  ) => void

  /**
   * The JavaScript runtime environment.
   */
  runtime: JSRuntime

  /**
   * The JavaScript runtime version.
   */
  runtimeVersion: string
  /**
   * A setup function that runs before each task execution.
   */
  setup: (task: Task, mode: 'run' | 'warmup') => Promise<void> | void
  /**
   * An AbortSignal to cancel the benchmark
   */
  signal?: AbortSignal
  /**
   * A teardown function that runs after each task execution.
   */
  teardown: (task: Task, mode: 'run' | 'warmup') => Promise<void> | void
  /**
   * The maximum number of concurrent tasks to run
   */
  threshold: number
  /**
   * Whether to throw an error if a task function throws
   */
  throws: boolean
  /**
   * The amount of time to run each task.
   */
  time: number
  /**
   * Whether to warmup the tasks before running them
   */
  warmup: boolean
  /**
   * The amount of warmup iterations per task.
   */
  warmupIterations: number
  /**
   * The amount of time to warmup each task.
   */
  warmupTime: number
}

/**
 * Bench options
 */
export interface BenchOptions {
  /**
   * Executes tasks concurrently based on the specified concurrency mode.
   *
   * - When `mode` is set to `null` (default), concurrency is disabled.
   * - When `mode` is set to 'task', each task's iterations (calls of a task function) run concurrently.
   * - When `mode` is set to 'bench', different tasks within the bench run concurrently.
   */
  concurrency?: Concurrency

  /**
   * The number of times that a task should run if even the time option is finished.
   * @default 64
   */
  iterations?: number

  /**
   * Benchmark name.
   */
  name?: string

  /**
   * Function to get the current timestamp in milliseconds.
   */
  now?: HighResolutionTimeStampFns | NowFn

  /**
   * Setup function to run before each benchmark task (cycle).
   */
  setup?: Hook

  /**
   * An AbortSignal for aborting the benchmark.
   */
  signal?: AbortSignal

  /**
   * Teardown function to run after each benchmark task (cycle).
   */
  teardown?: Hook

  /**
   * The maximum number of concurrent tasks to run
   * @default Number.POSITIVE_INFINITY
   */
  threshold?: number

  /**
   * Throws if a task fails.
   * @default false
   */
  throws?: boolean

  /**
   * Time needed for running a benchmark task in milliseconds.
   * @default 1000
   */
  time?: number

  /**
   * Warmup benchmark.
   * @default true
   */
  warmup?: boolean

  /**
   * Warmup iterations.
   * @default 16
   */
  warmupIterations?: number

  /**
   * Warmup time in milliseconds.
   * @default 250
   */
  warmupTime?: number
}

/**
 * - When `mode` is set to `null` (default), concurrency is disabled.
 * - When `mode` is set to 'task', each task's iterations (calls of a task function) run concurrently.
 * - When `mode` is set to 'bench', different tasks within the bench run concurrently.
 */
export type Concurrency = 'bench' | 'task' | null

/**
 * Converts a Task to a console.table friendly object
 */
export type ConsoleTableConverter = (
  task: Task
) => Record<string, number | string>

/**
 * Event listener
 */
export type EventListener<
  E extends BenchEvents,
  M extends 'bench' | 'task' = 'bench'
> = (evt: BenchEvent<E, M>) => void

/**
 * Both the `Task` and `Bench` objects extend the `EventTarget` object.
 * So you can attach a listeners to different types of events to each class instance
 * using the universal `addEventListener` and `removeEventListener` methods.
 */

export interface EventListenerObject<
  E extends BenchEvents,
  M extends 'bench' | 'task' = 'bench'
> {
  /**
   * A method called when the event is dispatched.
   */
  handleEvent(evt: BenchEvent<E, M>): void
}

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

export type HighResolutionTimeStampFns =
  | 'auto'
  | 'bunNanoseconds'
  | 'hrtimeNow'
  | 'performanceNow'

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
 * The JavaScript runtime environment.
 * @see https://runtime-keys.proposal.wintercg.org/
 */
export type JSRuntime =
  | 'browser'
  | 'bun'
  | 'deno'
  | 'edge-light'
  | 'fastly'
  | 'hermes'
  | 'jsc'
  | 'lagon'
  | 'moddable'
  | 'netlify'
  | 'node'
  | 'quickjs-ng'
  | 'spidermonkey'
  | 'unknown'
  | 'v8'
  | 'workerd'

/**
 * A function that returns the current timestamp.
 */
export type NowFn = () => number

// @types/node doesn't have these types globally, and we don't want to bring "dom" lib for everyone
export type RemoveEventListenerOptionsArgument = Parameters<
  typeof EventTarget.prototype.removeEventListener
>[2]

/**
 * The resolved benchmark options
 */
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
export type TaskEvents = Extract<
  BenchEvents,
  | 'abort' // when a signal aborts
  | 'complete' // when running a task finishes
  | 'cycle' // when running a task gets done
  | 'error' // when the task throws
  | 'reset' // when the reset method gets called
  | 'start' // when running the task gets started
  | 'warmup' // when the task start getting warmed up
>

/**
 * The task result
 */
export type TaskResult =
  | TaskResultAborted
  | TaskResultAbortedWithStatistics
  | TaskResultCompleted
  | TaskResultErrored
  | TaskResultNotStarted
  | TaskResultStarted

/**
 * The task result for aborted tasks.
 */
export interface TaskResultAborted {
  /**
   * the task state
   */
  state: 'aborted'
}

/**
 * The task result for aborted tasks, having also statistical data.
 */
export interface TaskResultAbortedWithStatistics
  extends TaskResultWithStatistics {
  /**
   * the task state
   */
  state: 'aborted-with-statistics'
}

/**
 * The task result for completed tasks with statistical data.
 */
export interface TaskResultCompleted extends TaskResultWithStatistics {
  /**
   * how long each operation takes (ms)
   */
  period: number

  /**
   * the task state
   */
  state: 'completed'
}

/**
 * The task result for errored tasks
 */
export interface TaskResultErrored {
  /**
   * the error that caused the task to fail
   */
  error: Error

  /**
   * the task state
   */
  state: 'errored'
}

/**
 * The task result for not started tasks
 */
export interface TaskResultNotStarted {
  /**
   * the task state
   */
  state: 'not-started'
}

/**
 * The additional runtime information for task results
 */
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
/**
 * The task result for started tasks
 */
export interface TaskResultStarted {
  /**
   * the task state
   */
  state: 'started'
}

/**
 * The statistical data for task results
 */
export interface TaskResultWithStatistics {
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
