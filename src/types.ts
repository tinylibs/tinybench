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

export interface Statistics {
  /**
   * samples
   */
  samples: number[];

  /**
   * the minimum value
   */
  min: number;

  /**
   * the maximum value
   */
  max: number;

  /**
   * mean/average (estimate of the population mean/average)
   */
  mean: number;

  /**
   * variance (estimate of the population variance)
   */
  variance: number;

  /**
   * standard deviation (estimate of the population standard deviation)
   */
  sd: number;

  /**
   * standard error of the mean/average (a.k.a. the standard deviation of the sampling distribution of the sample mean/average)
   */
  sem: number;

  /**
   * degrees of freedom
   */
  df: number;

  /**
   * critical value
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
   * mean/average absolute deviation
   */
  aad: number | undefined;

  /**
   * median absolute deviation
   */
  mad: number | undefined;

  /**
   * p50/median percentile
   */
  p50: number | undefined;

  /**
   * p75 percentile
   */
  p75: number | undefined;

  /**
   * p99 percentile
   */
  p99: number | undefined;

  /**
   * p995 percentile
   */
  p995: number | undefined;

  /**
   * p999 percentile
   */
  p999: number | undefined;
}

/**
 * the benchmark task result object
 */
export interface TaskResult {
  /*
   * the last task error that was thrown
   */
  error?: Error;

  /**
   * the time to run the task benchmark cycle (ms)
   */
  totalTime: number;

  /**
   * how long each operation takes (ms)
   */
  period: number;

  /**
   * the task latency statistics
   */
  latency: Statistics;

  /**
   * the task throughput statistics
   */
  throughput: Statistics;

  /**
   * the number of operations per second
   * @deprecated use `.throughput.mean` instead
   */
  hz: number;

  /**
   * latency samples (ms)
   * @deprecated use `.latency.samples` instead
   */
  samples: number[];

  /**
   * the minimum latency samples value
   * @deprecated use `.latency.min` instead
   */
  min: number;

  /**
   * the maximum latency samples value
   * @deprecated use `.latency.max` instead
   */
  max: number;

  /**
   * the latency samples mean/average (estimate of the population mean/average)
   * @deprecated use `.latency.mean` instead
   */
  mean: number;

  /**
   * the latency samples variance (estimate of the population variance)
   * @deprecated use `.latency.variance` instead
   */
  variance: number;

  /**
   * the latency samples standard deviation (estimate of the population standard deviation)
   * @deprecated use `.latency.sd` instead
   */
  sd: number;

  /**
   * the latency standard error of the mean (a.k.a. the standard deviation of the sampling distribution of the sample mean/average)
   * @deprecated use `.latency.sem` instead
   */
  sem: number;

  /**
   * the latency samples degrees of freedom
   * @deprecated use `.latency.df` instead
   */
  df: number;

  /**
   * the latency samples critical value
   * @deprecated use `.latency.critical` instead
   */
  critical: number;

  /**
   * the latency samples margin of error
   * @deprecated use `.latency.moe` instead
   */
  moe: number;

  /**
   * the latency samples relative margin of error
   * @deprecated use `.latency.rme` instead
   */
  rme: number;

  /**
   * the latency samples p75 percentile
   * @deprecated use `.latency.p75` instead
   */
  p75: number;

  /**
   * the latency samples p99 percentile
   * @deprecated use `.latency.p99` instead
   */
  p99: number;

  /**
   * the latency samples p995 percentile
   * @deprecated use `.latency.p995` instead
   */
  p995: number;

  /**
   * the latency samples p999 percentile
   * @deprecated use `.latency.p999` instead
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
   * benchmark name
   */
  name?: string;

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
   * warmup time (milliseconds) @default 100
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
