import type Task from '../src/task';

/**
 * the task function
 */
export type Fn = (...arg: unknown[]) => unknown | Promise<unknown>;

export interface FnOptions {
  /**
   * An optional function that is run before iterations of this task begin
   */
  beforeAll?: (this: Task) => void | Promise<void>;

  /**
   * An optional function that is run before each iteration of this task
   */
  beforeEach?: (this: Task) => void | Promise<void>;

  /**
   * An optional function that is run after each iteration of this task
   */
  afterEach?: (this: Task) => void | Promise<void>;

  /**
   * An optional function that is run after all iterations of this task end
   */
  afterAll?: (this: Task) => void | Promise<void>;
}

/**
 * the benchmark task result object
 */
export interface TaskResult {
  /*
   * the last error that was thrown while running the task
   */
  error?: unknown;

  /**
   * The amount of time in milliseconds to run the benchmark task (cycle).
   */
  totalTime: number;

  /**
   * the minimum value in the samples
   */
  min: number;
  /**
   * the maximum value in the samples
   */
  max: number;

  /**
   * the number of operations per second
   */
  hz: number;

  /**
   * how long each operation takes (ms)
   */
  period: number;

  /**
   * task samples of each task iteration time (ms)
   */
  samples: number[];

  /**
   * samples mean/average (estimate of the population mean)
   */
  mean: number;

  /**
   * samples variance (estimate of the population variance)
   */
  variance: number;

  /**
   * samples standard deviation (estimate of the population standard deviation)
   */
  sd: number;

  /**
   * standard error of the mean (a.k.a. the standard deviation of the sampling distribution of the sample mean)
   */
  sem: number;

  /**
   * degrees of freedom
   */
  df: number;

  /**
   * critical value of the samples
   */
  critical: number;

  /**
   * margin of error
   */
  moe: number;

  /**
   * relative margin of error
   */
  rme: number;

  /**
   * median absolute deviation
   */
  mad: number;

  /**
   * p50/median percentile
   */
  p50: number;

  /**
   * p75 percentile
   */
  p75: number;

  /**
   * p99 percentile
   */
  p99: number;

  /**
   * p995 percentile
   */
  p995: number;

  /**
   * p999 percentile
   */
  p999: number;
}

/**
 * Both the `Task` and `Bench` objects extend the `EventTarget` object,
 * so you can attach a listeners to different types of events
 * to each class instance using the universal `addEventListener` and
 * `removeEventListener`
 */

/**
 * Bench events
 */
export type BenchEvents =
  | 'abort' // when a signal aborts
  | 'complete' // when running a benchmark finishes
  | 'error' // when the benchmark task throws
  | 'reset' // when the reset function gets called
  | 'start' // when running the benchmarks gets started
  | 'warmup' // when the benchmarks start getting warmed up (before start)
  | 'cycle' // when running each benchmark task gets done (cycle)
  | 'add' // when a Task gets added to the Bench
  | 'remove'; // when a Task gets removed of the Bench

export type Hook = (task: Task, mode: 'warmup' | 'run') => void | Promise<void>;

export type BenchEvent = Event & { task?: Task };

export type EventListener = (evt: BenchEvent) => void;

export interface BenchEventsMap {
  abort: EventListener;
  start: EventListener;
  complete: EventListener;
  warmup: EventListener;
  reset: EventListener;
  add: EventListener;
  remove: EventListener;
  cycle: EventListener;
  error: EventListener;
}

/**
 * task events
 */
export type TaskEvents =
  | 'abort'
  | 'complete'
  | 'error'
  | 'reset'
  | 'start'
  | 'warmup'
  | 'cycle';

export interface TaskEventsMap {
  abort: EventListener;
  start: EventListener;
  error: EventListener;
  cycle: EventListener;
  complete: EventListener;
  warmup: EventListener;
  reset: EventListener;
}
export interface Options {
  /**
   * time needed for running a benchmark task (milliseconds) @default 500
   */
  time?: number;

  /**
   * number of times that a task should run if even the time option is finished @default 10
   */
  iterations?: number;

  /**
   * function to get the current timestamp in milliseconds
   */
  now?: () => number;

  /**
   * An AbortSignal for aborting the benchmark
   */
  signal?: AbortSignal;

  /**
   * Throw if a task fails (events will not work if true)
   */
  throws?: boolean;

  /**
   * warmup time (milliseconds) @default 100ms
   */
  warmupTime?: number;

  /**
   * warmup iterations @default 5
   */
  warmupIterations?: number;

  /**
   * setup function to run before each benchmark task (cycle)
   */
  setup?: Hook;

  /**
   * teardown function to run after each benchmark task (cycle)
   */
  teardown?: Hook;
}

// @types/node doesn't have these types globally, and we don't want to bring "dom" lib for everyone
export type RemoveEventListenerOptionsArgument = Parameters<
  typeof EventTarget.prototype.removeEventListener
>[2];
export type AddEventListenerOptionsArgument = Parameters<
  typeof EventTarget.prototype.addEventListener
>[2];
