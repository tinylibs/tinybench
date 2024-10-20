/* eslint-disable operator-linebreak */
import pLimit from 'p-limit';
import {
  defaultMinimumIterations,
  defaultMinimumTime,
  defaultMinimumWarmupIterations,
  defaultMinimumWarmupTime,
  emptyFunction,
} from './constants';
import { createBenchEvent } from './event';
import Task from './task';
import type {
  AddEventListenerOptionsArgument,
  BenchEvents,
  BenchEventsMap,
  Fn,
  FnOptions,
  Hook,
  Options,
  RemoveEventListenerOptionsArgument,
  TaskResult,
} from './types';
import { now } from './utils';

/**
 * The Benchmark instance for keeping track of the benchmark tasks and controlling
 * them.
 */
export default class Bench extends EventTarget {
  /**
   * @private the task map
   */
  private readonly _tasks = new Map<string, Task>();

  name?: string;

  /**
   * Executes tasks concurrently based on the specified concurrency mode.
   *
   * - When `mode` is set to `null` (default), concurrency is disabled.
   * - When `mode` is set to 'task', each task's iterations (calls of a task function) run concurrently.
   * - When `mode` is set to 'bench', different tasks within the bench run concurrently. Concurrent cycles.
   */
  concurrency: 'task' | 'bench' | null = null;

  /**
   * The maximum number of concurrent tasks to run @default Number.POSITIVE_INFINITY
   */
  threshold = Number.POSITIVE_INFINITY;

  signal?: AbortSignal;

  throws = false;

  warmup = true;

  warmupTime = defaultMinimumWarmupTime;

  warmupIterations = defaultMinimumWarmupIterations;

  time = defaultMinimumTime;

  iterations = defaultMinimumIterations;

  now = now;

  setup: Hook;

  teardown: Hook;

  constructor(options: Options = {}) {
    super();
    this.name = options.name;
    this.now = options.now ?? this.now;
    this.warmup = options.warmup ?? this.warmup;
    this.warmupTime = options.warmupTime ?? this.warmupTime;
    this.warmupIterations = options.warmupIterations ?? this.warmupIterations;
    this.time = options.time ?? this.time;
    this.iterations = options.iterations ?? this.iterations;
    this.signal = options.signal;
    this.throws = options.throws ?? this.throws;
    this.setup = options.setup ?? emptyFunction;
    this.teardown = options.teardown ?? emptyFunction;

    if (this.signal) {
      this.signal.addEventListener(
        'abort',
        () => {
          this.dispatchEvent(createBenchEvent('abort'));
        },
        { once: true },
      );
    }
  }

  private async runTask(task: Task): Promise<Task> {
    if (this.signal?.aborted) {
      return task;
    }
    return await task.run();
  }

  /**
   * run the added tasks that were registered using the {@link add} method.
   */
  async run(): Promise<Task[]> {
    let values: Task[] = [];
    this.dispatchEvent(createBenchEvent('start'));
    if (this.concurrency === 'bench') {
      const limit = pLimit(this.threshold);
      const promises: Promise<Task>[] = [];
      for (const task of this._tasks.values()) {
        promises.push(limit(() => this.runTask(task)));
      }
      values = await Promise.all(promises);
    } else {
      for (const task of this._tasks.values()) {
        values.push(await this.runTask(task));
      }
    }
    this.dispatchEvent(createBenchEvent('complete'));
    return values;
  }

  /**
   * reset each task and remove its result
   */
  reset(): void {
    this.dispatchEvent(createBenchEvent('reset'));
    for (const task of this._tasks.values()) {
      task.reset();
    }
  }

  /**
   * add a benchmark task to the task map
   */
  add(name: string, fn: Fn, opts: FnOptions = {}): this {
    const task = new Task(this, name, fn, opts);
    this._tasks.set(name, task);
    this.dispatchEvent(createBenchEvent('add', task));
    return this;
  }

  /**
   * remove a benchmark task from the task map
   */
  remove(name: string): this {
    const task = this.getTask(name);
    if (task) {
      this.dispatchEvent(createBenchEvent('remove', task));
      this._tasks.delete(name);
    }
    return this;
  }

  addEventListener<K extends BenchEvents>(
    type: K,
    listener: BenchEventsMap[K],
    options?: AddEventListenerOptionsArgument,
  ): void {
    super.addEventListener(type, listener, options);
  }

  removeEventListener<K extends BenchEvents>(
    type: K,
    listener: BenchEventsMap[K],
    options?: RemoveEventListenerOptionsArgument,
  ): void {
    super.removeEventListener(type, listener, options);
  }

  /**
   * table of the tasks results
   */
  table(
    convert?: (task: Task) => Record<string, string | number> | undefined,
  ): (Record<string, string | number> | undefined | null)[] {
    return this.tasks.map((task) => {
      if (task.result) {
        if (task.result.error) {
          throw task.result.error;
        }
        return (
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          convert?.(task) || {
            'Task name': task.name,
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            'Throughput average (ops/s)': task.result.error
              ? 'NaN'
              : `${task.result.throughput.mean.toFixed(0)} \xb1 ${task.result.throughput.rme.toFixed(2)}%`,
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            'Throughput median (ops/s)': task.result.error
              ? 'NaN'
              : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              `${task.result.throughput.p50!.toFixed(0)}${Number.parseInt(task.result.throughput.mad!.toFixed(0), 10) > 0 ? ` \xb1 ${task.result.throughput.mad!.toFixed(0)}` : ''}`,
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            'Latency average (ns)': task.result.error
              ? 'NaN'
              : `${(task.result.latency.mean * 1e6).toFixed(2)} \xb1 ${task.result.latency.rme.toFixed(2)}%`,
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            'Latency median (ns)': task.result.error
              ? 'NaN'
              : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              `${(task.result.latency.p50! * 1e6).toFixed(2)}${Number.parseFloat((task.result.latency.mad! * 1e6).toFixed(2)) > 0 ? ` \xb1 ${(task.result.latency.mad! * 1e6).toFixed(2)}` : ''}`,
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            Samples: task.result.error
              ? 'NaN'
              : task.result.latency.samples.length,
          }
        );
      }
      return null;
    });
  }

  /**
   * (getter) tasks results as an array
   */
  get results(): (Readonly<TaskResult> | undefined)[] {
    return [...this._tasks.values()].map((task) => task.result);
  }

  /**
   * (getter) tasks as an array
   */
  get tasks(): Task[] {
    return [...this._tasks.values()];
  }

  /**
   * get a task based on the task name
   */
  getTask(name: string): Task | undefined {
    return this._tasks.get(name);
  }
}
