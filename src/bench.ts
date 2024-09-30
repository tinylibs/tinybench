import pLimit from 'p-limit';
import type {
  Hook,
  Options,
  Fn,
  BenchEvents,
  TaskResult,
  BenchEventsMap,
  FnOptions,
} from './types';
import { createBenchEvent } from './event';
import Task from './task';
import { AddEventListenerOptionsArgument, RemoveEventListenerOptionsArgument } from './types';
import { now } from './utils';

/**
 * The Benchmark instance for keeping track of the benchmark tasks and controlling
 * them.
 */
export default class Bench extends EventTarget {
  /*
   * @private the task map
   */
  _tasks: Map<string, Task> = new Map();

  _todos: Map<string, Task> = new Map();

  /**
 * Executes tasks concurrently based on the specified concurrency mode.
 *
 * - When `mode` is set to `null` (default), concurrency is disabled.
 * - When `mode` is set to 'task', each task's iterations (calls of a task function) run concurrently.
 * - When `mode` is set to 'bench', different tasks within the bench run concurrently.
 */
  concurrency: 'task' | 'bench' | null = null;

  /**
   * The maximum number of concurrent tasks to run. Defaults to Infinity.
   */
  threshold = Infinity;

  signal?: AbortSignal;

  throws: boolean;

  warmupTime = 100;

  warmupIterations = 5;

  time = 500;

  iterations = 10;

  now = now;

  setup: Hook;

  teardown: Hook;

  constructor(options: Options = {}) {
    super();
    this.now = options.now ?? this.now;
    this.warmupTime = options.warmupTime ?? this.warmupTime;
    this.warmupIterations = options.warmupIterations ?? this.warmupIterations;
    this.time = options.time ?? this.time;
    this.iterations = options.iterations ?? this.iterations;
    this.signal = options.signal;
    this.throws = options.throws ?? false;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this.setup = options.setup ?? (() => {});
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this.teardown = options.teardown ?? (() => {});

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

  private runTask(task: Task) {
    if (this.signal?.aborted) return task;
    return task.run();
  }

  /**
   * run the added tasks that were registered using the
   * {@link add} method.
   * Note: This method does not do any warmup. Call {@link warmup} for that.
   */
  async run(): Promise<Task[]> {
    if (this.concurrency === 'bench') {
      // TODO: in the next major, we should remove runConcurrently
      return this.runConcurrently(this.threshold, this.concurrency);
    }
    this.dispatchEvent(createBenchEvent('start'));
    const values: Task[] = [];
    for (const task of [...this._tasks.values()]) {
      values.push(await this.runTask(task));
    }
    this.dispatchEvent(createBenchEvent('complete'));
    return values;
  }

  /**
   * See Bench.{@link concurrency}
   */
  async runConcurrently(threshold = Infinity, mode: NonNullable<Bench['concurrency']> = 'bench'): Promise<Task[]> {
    this.threshold = threshold;
    this.concurrency = mode;

    if (mode === 'task') {
      return this.run();
    }

    this.dispatchEvent(createBenchEvent('start'));

    const limit = pLimit(threshold);

    const promises: Promise<Task>[] = [];
    for (const task of [...this._tasks.values()]) {
      promises.push(limit(() => this.runTask(task)));
    }

    const values = await Promise.all(promises);

    this.dispatchEvent(createBenchEvent('complete'));

    return values;
  }

  /**
   * warmup the benchmark tasks.
   * This is not run by default by the {@link run} method.
   */
  async warmup(): Promise<void> {
    if (this.concurrency === 'bench') {
      // TODO: in the next major, we should remove *Concurrently methods
      await this.warmupConcurrently(this.threshold, this.concurrency);
      return;
    }
    this.dispatchEvent(createBenchEvent('warmup'));
    for (const [, task] of this._tasks) {
      await task.warmup();
    }
  }

  /**
   * warmup the benchmark tasks concurrently.
   * This is not run by default by the {@link runConcurrently} method.
   */
  async warmupConcurrently(threshold = Infinity, mode: NonNullable<Bench['concurrency']> = 'bench'): Promise<void> {
    this.threshold = threshold;
    this.concurrency = mode;

    if (mode === 'task') {
      await this.warmup();
      return;
    }

    this.dispatchEvent(createBenchEvent('warmup'));
    const limit = pLimit(threshold);
    const promises: Promise<void>[] = [];

    for (const [, task] of this._tasks) {
      promises.push(limit(() => task.warmup()));
    }

    await Promise.all(promises);
  }

  /**
   * reset each task and remove its result
   */
  reset() {
    this.dispatchEvent(createBenchEvent('reset'));
    this._tasks.forEach((task) => {
      task.reset();
    });
  }

  /**
   * add a benchmark task to the task map
   */
  add(name: string, fn: Fn, opts: FnOptions = {}) {
    const task = new Task(this, name, fn, opts);
    this._tasks.set(name, task);
    this.dispatchEvent(createBenchEvent('add', task));
    return this;
  }

  /**
   * add a benchmark todo to the todo map
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  todo(name: string, fn: Fn = () => {}, opts: FnOptions = {}) {
    const task = new Task(this, name, fn, opts);
    this._todos.set(name, task);
    this.dispatchEvent(createBenchEvent('todo', task));
    return this;
  }

  /**
   * remove a benchmark task from the task map
   */
  remove(name: string) {
    const task = this.getTask(name);
    if (task) {
      this.dispatchEvent(createBenchEvent('remove', task));
      this._tasks.delete(name);
    }
    return this;
  }

  addEventListener<K extends BenchEvents, T = BenchEventsMap[K]>(
    type: K,
    listener: T,
    options?: AddEventListenerOptionsArgument,
  ): void {
    super.addEventListener(type, listener as any, options);
  }

  removeEventListener<K extends BenchEvents, T = BenchEventsMap[K]>(
    type: K,
    listener: T,
    options?: RemoveEventListenerOptionsArgument,
  ) {
    super.removeEventListener(type, listener as any, options);
  }

  /**
   * table of the tasks results
   */
  table(convert?: (task: Task) => Record<string, string | number> | undefined) {
    return this.tasks.map((task) => {
      if (task.result) {
        if (task.result.error) {
          throw task.result.error;
        }
        return convert?.(task) || {
          'Task name': task.name,
          'ops/sec': task.result.error ? 'NaN' : parseInt(task.result.hz.toString(), 10).toLocaleString(),
          'Average time/op (ns)': task.result.error ? 'NaN' : task.result.mean * 1e6,
          Margin: task.result.error ? 'NaN' : `\xb1${task.result.rme.toFixed(2)}%`,
          'Median time/op (ns)': task.result.error ? 'NaN' : `${task.result.p50 * 1e6}${task.result.mad * 1e6 > 0 ? `\xb1${(task.result.mad * 1e6).toFixed(10)}` : ''}`,
          Samples: task.result.error ? 'NaN' : task.result.samples.length,
        };
      }
      return null;
    });
  }

  /**
   * (getter) tasks results as an array
   */
  get results(): (TaskResult | undefined)[] {
    return [...this._tasks.values()].map((task) => task.result);
  }

  /**
   * (getter) tasks as an array
   */
  get tasks(): Task[] {
    return [...this._tasks.values()];
  }

  get todos(): Task[] {
    return [...this._todos.values()];
  }

  /**
   * get a task based on the task name
   */
  getTask(name: string): Task | undefined {
    return this._tasks.get(name);
  }
}
