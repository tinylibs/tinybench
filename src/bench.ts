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

  /**
   * run the added tasks that were registered using the
   * {@link add} method.
   * Note: This method does not do any warmup. Call {@link warmup} for that.
   */
  async run() {
    this.dispatchEvent(createBenchEvent('start'));
    const values: Task[] = [];
    for (const task of [...this._tasks.values()]) {
      if (this.signal?.aborted) values.push(task);
      else values.push(await task.run());
    }
    this.dispatchEvent(createBenchEvent('complete'));
    return values;
  }

  /**
   * warmup the benchmark tasks.
   * This is not run by default by the {@link run} method.
   */
  async warmup() {
    this.dispatchEvent(createBenchEvent('warmup'));
    for (const [, task] of this._tasks) {
      await task.warmup();
    }
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
    const task = new Task(this, name, fn, { ...opts, isTodo: false });
    this._tasks.set(name, task);
    this.dispatchEvent(createBenchEvent('add', task));
    return this;
  }

  /**
   * add a benchmark todo to the todo map
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  todo(name: string, fn: Fn = () => {}, opts: FnOptions = {}) {
    const task = new Task(this, name, fn, { ...opts, isTodo: true });
    this._tasks.set(name, task);
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
    super.addEventListener(type as string, listener as any, options);
  }

  removeEventListener<K extends BenchEvents, T = BenchEventsMap[K]>(
    type: K,
    listener: T,
    options?: RemoveEventListenerOptionsArgument,
  ) {
    super.removeEventListener(type as string, listener as any, options);
  }

  /**
   * table of the tasks results
   */
  table() {
    return this.tasks.map(({ name, result }) => {
      if (result) {
        return {
          'Task Name': name,
          'ops/sec': result.error ? 'NaN' : parseInt(result.hz.toString(), 10).toLocaleString(),
          'Average Time (ns)': result.error ? 'NaN' : result.mean * 1000 * 1000,
          Margin: result.error ? 'NaN' : `\xb1${result.rme.toFixed(2)}%`,
          Samples: result.error ? 'NaN' : result.samples.length,
        };
      }
      return null;
    });
  }

  /**
   * (getter) tasks results as an array
   */
  get results(): (TaskResult | undefined)[] {
    return this.tasks.map((task) => task.result);
  }

  /**
   * (getter) tasks as an array
   */
  get tasks(): Task[] {
    return [...this._tasks.values()].filter((task) => !task.isTodo);
  }

  get todos(): Task[] {
    return [...this._tasks.values()].filter((task) => task.isTodo);
  }

  /**
   * get a task based on the task name
   */
  getTask(name: string): Task | undefined {
    return this._tasks.get(name);
  }
}
