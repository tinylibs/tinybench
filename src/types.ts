import type { BenchEvent } from '../src/event'
import type { Task } from '../src/task'

export type { BenchEvent } from '../src/event'

/**
 * Options for adding an event listener
 */
export type AddEventListenerOptionsArgument = Parameters<
  EventTarget['addEventListener']
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
  | 'warning' // when timer saturation is detected for a task's latency samples

/**
 * Bench events that may have an associated Task
 */
export type BenchEventsOptionalTask = Exclude<
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
  'add' | 'cycle' | 'error' | 'remove' | 'warning'
>

/**
 * Used to decouple Bench and Task
 */
export interface BenchLike extends EventTarget {
  /**
   * Adds a listener for the specified event type.
   */
  addEventListener: (<K extends BenchEvents>(
    type: K,
    listener: EventListener<K> | EventListenerObject<K> | null,
    options?: AddEventListenerOptionsArgument
  ) => void) & EventTarget['addEventListener']
  /**
   * Executes tasks concurrently based on the specified concurrency mode, if set.
   *
   * - When `mode` is set to `null` (default), concurrency is disabled.
   * - When `mode` is set to 'task', each task's iterations (calls of a task function) run concurrently.
   * - When `mode` is set to 'bench', different tasks within the bench run concurrently.
   */
  concurrency: Concurrency
  /**
   * The iteration limit per task; see {@link BenchOptions.iterations}.
   */
  iterations: number
  /**
   * A function to get a timestamp.
   */
  now: NowFn

  /**
   * Removes a previously registered event listener.
   */
  removeEventListener: (<K extends BenchEvents>(
    type: K,
    listener: EventListener<K> | EventListenerObject<K> | null,
    options?: RemoveEventListenerOptionsArgument
  ) => void) & EventTarget['removeEventListener']

  /**
   * Should samples be retained for further custom processing
   */
  retainSamples: boolean

  /**
   * The JavaScript runtime environment.
   */
  runtime: JSRuntime

  /**
   * The JavaScript runtime version.
   */
  runtimeVersion: string
  /**
   * A setup function called once per task and phase.
   */
  setup: (task: Task, mode: HookMode) => Promise<void> | void
  /**
   * An AbortSignal to cancel the benchmark
   */
  signal?: AbortSignal
  /**
   * A teardown function called once per task and phase.
   */
  teardown: (task: Task, mode: HookMode) => Promise<void> | void
  /**
   * The maximum concurrent iterations within a task; only for `concurrency: 'task'`.
   */
  threshold: number
  /**
   * Whether to throw an error if a task function throws
   */
  throws: boolean
  /**
   * The time budget per task in milliseconds; see {@link BenchOptions.time}.
   */
  time: number
  /**
   * The estimated cost of one timestamp provider call in milliseconds.
   *
   * Calibrated once at construction; `undefined` (or omitted) when timer
   * overhead subtraction is disabled or unsupported by the implementation.
   */
  readonly timerOverhead?: number
  /**
   * The timestamp provider used by the benchmark.
   */
  timestampProvider: TimestampProvider
  /**
   * Whether to warmup the tasks before running them
   */
  warmup: boolean
  /**
   * The warmup iteration limit per task; see {@link BenchOptions.warmupIterations}.
   */
  warmupIterations: number
  /**
   * The warmup time budget in milliseconds; see {@link BenchOptions.warmupTime}.
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
   * Minimum iterations per task in sequential modes (`null` and `'bench'`).
   * With `concurrency: 'task'`, a positive value instead caps scheduled
   * iterations; scheduling stops when either positive iteration or time limit
   * is reached. Zero disables this limit in that mode.
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
  now?: NowFn

  /**
   * Keep samples for statistics calculation
   * @default false
   */
  retainSamples?: boolean

  /**
   * Setup function to run before each benchmark task (cycle)
   */
  setup?: Hook

  /**
   * An AbortSignal for aborting the benchmark.
   */
  signal?: AbortSignal

  /**
   * Whether to subtract an estimated timestamp provider call overhead from
   * each raw latency sample.
   *
   * Each sample is measured as `t1 - t0` around a single call to the task
   * function, so every raw sample is inflated by approximately one
   * timestamp provider call cost `C`. When this option is `true`, an
   * estimate `Ĉ` is computed once at construction time via
   * {@link calibrateTimerOverhead}, and `max(0, raw_sample - Ĉ)` is used
   * in place of each non-overridden sample before statistics are computed.
   *
   * **Statistics after correction.** Statistics use the final samples, after
   * correction and any duration overrides. When all latency samples are
   * timer-measured and exceed `Ĉ`, subtracting the constant shifts location
   * statistics by `Ĉ` while leaving variance and absolute dispersion unchanged
   * apart from rounding. Relative error can increase as the mean decreases.
   *
   * When samples clamp to zero, these translation rules no longer hold.
   * Quantiles are interpolated: exactly half zero samples need not give a
   * zero median, and a zero median does not imply zero mean absolute deviation.
   * Prefer `overriddenDuration` for sub-overhead measurements.
   *
   * **Three observable consequences of the clamp.**
   *
   * 1. `latency.min` may be exactly `0` even when no zero-duration sample
   *    was actually observed.
   * 2. The throughput estimator substitutes `1000 / latency.mean` (or `0`
   *    when `mean === 0`) for every clamped sample.
   * 3. {@link detectTimerSaturation} criterion `'zero-dominated'` cannot
   *    distinguish clamped samples from genuine zero-duration timer
   *    reads, so a `'warning'` event may be dispatched in the
   *    sub-overhead regime even when the timer itself is not saturated.
   *
   * **Caveat — `concurrency: "task"`.** The overhead is calibrated once
   * at construction time with sequential timer calls. Setting both
   * options causes the constructor (and `run()`) to throw, since the
   * sequentially-calibrated estimate would not reflect the per-iteration
   * timer call cost under concurrent execution.
   *
   * **Caveat — `overriddenDuration`.** Samples returned by the task
   * function via `overriddenDuration` are intentional user values and
   * are never modified by the correction. They are also excluded from
   * {@link Task.detectedResolution} and from timer-saturation detection.
   *
   * If fewer than half of the calibration pairs have positive deltas, the
   * estimate is `0` and the correction is a no-op.
   * @default false
   */
  subtractTimerOverhead?: boolean

  /**
   * Teardown function to run after each benchmark task (cycle).
   */
  teardown?: Hook

  /**
   * Maximum concurrent iterations within a task. Only applies with
   * `concurrency: 'task'`; does not limit concurrent benchmark tasks.
   * @default Number.POSITIVE_INFINITY
   */
  threshold?: number

  /**
   * Throws if a task fails.
   * @default false
   */
  throws?: boolean

  /**
   * Time budget per task in milliseconds. Sequential modes keep running
   * until both this budget and the minimum iteration count are met. With
   * `concurrency: 'task'`, a positive finite value instead limits scheduling
   * by elapsed time; reaching either positive limit stops new iterations.
   * @default 1000
   */
  time?: number

  /**
   * The timestamp provider used by the benchmark. By default 'performance.now'
   * will be used.
   */
  timestampProvider?: TimestampFns | TimestampProvider

  /**
   * Warmup benchmark.
   * @default true
   */
  warmup?: boolean

  /**
   * Warmup iteration limit. {@link Task.warmup} uses the mode-dependent
   * semantics of {@link iterations}; {@link Task.warmupSync} always treats
   * this as a minimum.
   * @default 16
   */
  warmupIterations?: number

  /**
   * Warmup time budget in milliseconds. {@link Task.warmup} uses the
   * mode-dependent semantics of {@link time}; {@link Task.warmupSync}
   * always uses the sequential budget.
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
 * `bench.now()` to measure that duration. When the task function batches
 * several inner calls, also return `overriddenIterationCost` so the `time`
 * budget reflects the whole iteration while samples record batch means.
 *
 * Task results are unrestricted. See {@link FnReturnedObject} for explicit
 * compile-time checks of measurement fields.
 */
export type Fn = () => unknown

/**
 * The task hook function signature.
 * Hooks apply to both run and warmup phases when warmup is enabled.
 * `beforeAll`/`afterAll` run once per task and phase; `beforeEach`/`afterEach`
 * run once per iteration.
 * @param mode the mode where the hook is being called
 */
export type FnHook = (this: Task, mode?: HookMode) => Promise<void> | void

/**
 * The task function options
 */
export interface FnOptions {
  /**
   * Runs once after all iterations of a task phase (warmup or run).
   */
  afterAll?: FnHook

  /**
   * Runs after each iteration in both warmup and run phases.
   */
  afterEach?: FnHook

  /**
   * Whether the provided task function is asynchronous, otherwise it is
   * determined automatically.
   *
   * Measuring an async task awaits it inside the timed window, so each sample
   * includes one microtask-turn overhead that `subtractTimerOverhead` does not
   * remove. For sub-resolution timings, prefer `overriddenDuration`.
   */
  async?: boolean

  /**
   * Runs once before the iterations of a task phase (warmup or run).
   */
  beforeAll?: FnHook

  /**
   * Runs before each iteration in both warmup and run phases.
   */
  beforeEach?: FnHook

  /**
   * Retain samples for this task, overriding the bench-level retainSamples option
   */
  retainSamples?: boolean

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
 * Annotate a callback return as this type (`Promise<FnReturnedObject>` for
 * async callbacks), or use `satisfies FnReturnedObject` on the returned object
 * to check measurement fields. Annotating the callback as {@link Fn} alone
 * does not check them. Numeric values are still validated at runtime.
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

  /**
   * The declared duration of the whole task function call, in milliseconds,
   * consumed by the sequential `time` and `warmupTime` budgets. If absent or
   * invalid, the budget uses the sample before timer-overhead correction.
   *
   * Must be finite and non-negative (`0` and `-0` included). Own and inherited
   * properties are supported; presence-check and access errors are treated
   * as absence. Repeated zero costs cannot satisfy a positive time budget.
   *
   * Applies per task with `concurrency: 'bench'` and in
   * {@link Task.warmupSync} regardless of concurrency. Ignored by task-concurrent
   * `run()` and `warmup()`, whose budgets use the clock. Does not affect samples,
   * timer-overhead correction or timer diagnostics.
   */
  overriddenIterationCost?: number
}

/**
 * The hook function signature.
 * Called once per task and phase: warmup (if enabled), then run.
 * @param task the task instance
 * @param mode the mode where the hook is being called
 */
export type Hook = (task?: Task, mode?: HookMode) => Promise<void> | void

/**
 * The mode in which a task hook is invoked ('warmup' or 'run').
 */
export type HookMode = 'run' | 'warmup'

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
  EventTarget['removeEventListener']
>[2]

/**
 * The resolved benchmark options
 */
export interface ResolvedBenchOptions extends BenchOptions {
  iterations: NonNullable<BenchOptions['iterations']>
  now: NonNullable<BenchOptions['now']>
  setup: NonNullable<BenchOptions['setup']>
  subtractTimerOverhead: NonNullable<BenchOptions['subtractTimerOverhead']>
  teardown: NonNullable<BenchOptions['teardown']>
  throws: NonNullable<BenchOptions['throws']>
  time: NonNullable<BenchOptions['time']>
  warmup: NonNullable<BenchOptions['warmup']>
  warmupIterations: NonNullable<BenchOptions['warmupIterations']>
  warmupTime: NonNullable<BenchOptions['warmupTime']>
}

/**
 * A type representing a samples-array with at least one number.
 */
export type Samples = [number, ...number[]]

/**
 * A type representing a sorted samples-array with at least one number.
 */
export type SortedSamples = Samples & {
  /**
   * A unique symbol to identify sorted samples
   */
  readonly __sorted__: unique symbol
}

/**
 * Location and dispersion statistics use the samples' units (ms for latency,
 * ops/s for throughput), except variance (squared units). Relative margin of
 * error is a percentage; counts and critical values are dimensionless.
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
   * median absolute deviation, not scaled by the 1.4826 normal-consistency factor
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
   * Relative margin of error in percent: `100 * moe / abs(mean)`.
   * Infinity when the mean is zero.
   */
  rme: number

  /**
   * samples used to calculate the statistics
   */
  samples: SortedSamples | undefined

  /**
   * samples count
   */
  samplesCount: number

  /**
   * standard deviation
   */
  sd: number

  /**
   * standard error of the mean/average (a.k.a. the standard deviation of the distribution of the sample mean/average)
   */
  sem: number

  /**
   * Sample variance, in squared sample units.
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
  | 'warning' // when timer saturation is detected for the task's latency samples
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
 * The timestamp provider information for task results
 */
export interface TaskResultTimestampProviderInfo {
  /**
   * the name of the timestamp provider used during the benchmark
   */
  timestampProviderName: TimestampProviderName
}

/**
 * The statistical data for task results
 */
export interface TaskResultWithStatistics {
  /**
   * Statistics of final latency samples in milliseconds.
   */
  latency: Statistics

  /**
   * Mean final latency in milliseconds: `totalTime / runs`.
   */
  period: number

  /**
   * Throughput statistics in operations per second.
   */
  throughput: Statistics

  /**
   * Sum of final latency samples in milliseconds, after overrides and overhead
   * correction; not elapsed wall time or the consumed iteration-cost budget.
   */
  totalTime: number
}

/**
 * Reason a sample set is classified as timer-saturated.
 * Classification requires at least 10 samples. For task diagnostics these are
 * timer-measured samples after correction; overridden samples are excluded.
 *
 * - `'zero-dominated'` — more than half of the samples are exactly zero.
 * - `'low-distinct'` — distinct sample count is below
 *   `max(3, min(10, ⌊n / 1000⌋))`.
 * - `'zero-mad'` — median absolute deviation is zero with more than 100
 *   samples.
 */
export type TimerSaturationReason =
  | 'low-distinct'
  | 'zero-dominated'
  | 'zero-mad'

/**
 * A timestamp function that returns either a number or bigint.
 */
export type TimestampFn = () => TimestampValue

/**
 * Possible timestamp provider names.
 * 'custom' is used when a custom timestamp function is provided.
 */
export type TimestampFns =
  | 'auto'
  | 'bunNanoseconds'
  | 'custom'
  | 'hrtimeNow'
  | 'performanceNow'

/**
 * A timestamp provider and its related functions.
 */
export interface TimestampProvider {
  /**
   * The actual function of the timestamp provider.
   * @returns the timestamp value
   */
  fn: TimestampFn
  /**
   * Converts milliseconds to the timestamp value.
   * @param value - the milliseconds value
   * @returns the timestamp value
   */
  fromMs: (value: number) => TimestampValue
  /**
   * The name of the timestamp provider.
   */
  name: TimestampProviderName
  /**
   * Converts the timestamp value to milliseconds.
   * @param value - the timestamp value
   * @returns the milliseconds
   */
  toMs: (value: TimestampValue) => number
}

/**
 * The name of a timestamp provider: a known provider name or any custom string.
 */
export type TimestampProviderName = (string & {}) | TimestampFns

/**
 * A timestamp value, either number or bigint. Internally timestamps can use
 * either representation depending on the environment and the chosen timestamp
 * function.
 */
export type TimestampValue = bigint | number
