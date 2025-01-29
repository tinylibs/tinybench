import pLimit from 'p-limit'

import type {
  AddEventListenerOptionsArgument,
  BenchEvents,
  BenchEventsMap,
  BenchOptions,
  Fn,
  FnOptions,
  RemoveEventListenerOptionsArgument,
  TaskResult,
} from './types'

import {
  defaultMinimumIterations,
  defaultMinimumTime,
  defaultMinimumWarmupIterations,
  defaultMinimumWarmupTime,
  emptyFunction,
} from './constants'
import { createBenchEvent } from './event'
import { Task } from './task'
import {
  formatNumber,
  invariant,
  type JSRuntime,
  mToNs,
  now,
  runtime,
  runtimeVersion,
} from './utils'

/**
 * The Bench class keeps track of the benchmark tasks and controls them.
 */
export class Bench extends EventTarget {
  /**
   * Executes tasks concurrently based on the specified concurrency mode.
   *
   * - When `mode` is set to `null` (default), concurrency is disabled.
   * - When `mode` is set to 'task', each task's iterations (calls of a task function) run concurrently.
   * - When `mode` is set to 'bench', different tasks within the bench run concurrently. Concurrent cycles.
   */
  concurrency: 'bench' | 'task' | null = null

  /**
   * The benchmark name.
   */
  readonly name?: string

  /**
   * The options.
   */
  readonly opts: Readonly<BenchOptions>

  /**
   * The JavaScript runtime environment.
   */
  readonly runtime: 'unknown' | JSRuntime

  /**
   * The JavaScript runtime version.
   */
  readonly runtimeVersion: string

  /**
   * The maximum number of concurrent tasks to run @default Number.POSITIVE_INFINITY
   */
  threshold = Number.POSITIVE_INFINITY

  /**
   * tasks results as an array
   * @returns the tasks results as an array
   */
  get results (): (Readonly<TaskResult> | undefined)[] {
    return [...this._tasks.values()].map(task => task.result)
  }

  /**
   * tasks as an array
   * @returns the tasks as an array
   */
  get tasks (): Task[] {
    return [...this._tasks.values()]
  }

  /**
   * the task map
   */
  private readonly _tasks = new Map<string, Task>()

  constructor (options: BenchOptions = {}) {
    super()
    this.name = options.name
    delete options.name
    this.runtime = runtime
    this.runtimeVersion = runtimeVersion
    this.opts = {
      ...{
        iterations: defaultMinimumIterations,
        now,
        setup: emptyFunction,
        teardown: emptyFunction,
        throws: false,
        time: defaultMinimumTime,
        warmup: true,
        warmupIterations: defaultMinimumWarmupIterations,
        warmupTime: defaultMinimumWarmupTime,
      },
      ...options,
    }

    if (this.opts.signal) {
      this.opts.signal.addEventListener(
        'abort',
        () => {
          this.dispatchEvent(createBenchEvent('abort'))
        },
        { once: true }
      )
    }
  }

  /**
   * add a benchmark task to the task map
   * @param name - the task name
   * @param fn - the task function
   * @param fnOpts - the task function options
   * @returns the Bench instance
   * @throws if the task already exists
   */
  add (name: string, fn: Fn, fnOpts: FnOptions = {}): this {
    if (!this._tasks.has(name)) {
      const task = new Task(this, name, fn, fnOpts)
      this._tasks.set(name, task)
      this.dispatchEvent(createBenchEvent('add', task))
    } else {
      throw new Error(`Task "${name}" already exists`)
    }
    return this
  }

  addEventListener<K extends BenchEvents>(
    type: K,
    listener: BenchEventsMap[K],
    options?: AddEventListenerOptionsArgument
  ): void {
    super.addEventListener(type, listener, options)
  }

  /**
   * get a task based on the task name
   * @param name - the task name
   * @returns the Task instance
   */
  getTask (name: string): Task | undefined {
    return this._tasks.get(name)
  }

  /**
   * remove a benchmark task from the task map
   * @param name - the task name
   * @returns the Bench instance
   */
  remove (name: string): this {
    const task = this.getTask(name)
    if (task) {
      this.dispatchEvent(createBenchEvent('remove', task))
      this._tasks.delete(name)
    }
    return this
  }

  removeEventListener<K extends BenchEvents>(
    type: K,
    listener: BenchEventsMap[K],
    options?: RemoveEventListenerOptionsArgument
  ): void {
    super.removeEventListener(type, listener, options)
  }

  /**
   * reset tasks and remove their result
   */
  reset (): void {
    this.dispatchEvent(createBenchEvent('reset'))
    for (const task of this._tasks.values()) {
      task.reset()
    }
  }

  /**
   * run the added tasks that were registered using the {@link add} method
   * @returns the tasks array
   */
  async run (): Promise<Task[]> {
    if (this.opts.warmup) {
      await this.warmupTasks()
    }
    let values: Task[] = []
    this.dispatchEvent(createBenchEvent('start'))
    if (this.concurrency === 'bench') {
      const limit = pLimit(this.threshold)
      const promises: Promise<Task>[] = []
      for (const task of this._tasks.values()) {
        promises.push(limit(task.run.bind(task)))
      }
      values = await Promise.all(promises)
    } else {
      for (const task of this._tasks.values()) {
        values.push(await task.run())
      }
    }
    this.dispatchEvent(createBenchEvent('complete'))
    return values
  }

  /**
   * run the added tasks that were registered using the {@link add} method (sync version)
   * @returns the tasks array
   */
  runSync (): Task[] {
    invariant(
      this.concurrency === null,
      'Cannot use `concurrency` option when using `runSync`'
    )
    if (this.opts.warmup) {
      this.warmupTasksSync()
    }
    const values: Task[] = []
    this.dispatchEvent(createBenchEvent('start'))
    for (const task of this._tasks.values()) {
      values.push(task.runSync())
    }
    this.dispatchEvent(createBenchEvent('complete'))
    return values
  }

  /**
   * table of the tasks results
   * @param convert - an optional callback to convert the task result to a table record
   * @returns the tasks results as an array of table records
   */
  table (
    convert?: (task: Task) => Record<string, number | string | undefined>
  ): (null | Record<string, number | string | undefined>)[] {
    return this.tasks.map(task => {
      if (task.result) {
        /* eslint-disable perfectionist/sort-objects */
        return task.result.error
          ? {
              'Task name': task.name,
              Error: task.result.error.message,
              Stack: task.result.error.stack,
            }
          : (convert?.(task) ?? {
              'Task name': task.name,
              'Latency average (ns)': `${formatNumber(mToNs(task.result.latency.mean), 5, 2)} \xb1 ${task.result.latency.rme.toFixed(2)}%`,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              'Latency median (ns)': `${formatNumber(mToNs(task.result.latency.p50!), 5, 2)} \xb1 ${mToNs(task.result.latency.mad!).toFixed(2)}`,
              'Throughput average (ops/s)': `${task.result.throughput.mean.toFixed(0)} \xb1 ${task.result.throughput.rme.toFixed(2)}%`,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              'Throughput median (ops/s)': `{Math.round(task.result.throughput.p50!)} \xb1 ${Math.round(task.result.throughput.mad)}`,
              Samples: task.result.latency.samples.length,
            })
        /* eslint-enable perfectionist/sort-objects */
      }
      return null
    })
  }

  /**
   * warmup the benchmark tasks.
   */
  private async warmupTasks (): Promise<void> {
    this.dispatchEvent(createBenchEvent('warmup'))
    if (this.concurrency === 'bench') {
      const limit = pLimit(this.threshold)
      const promises: Promise<void>[] = []
      for (const task of this._tasks.values()) {
        promises.push(limit(task.warmup.bind(task)))
      }
      await Promise.all(promises)
    } else {
      for (const task of this._tasks.values()) {
        await task.warmup()
      }
    }
  }

  /**
   * warmup the benchmark tasks (sync version)
   */
  private warmupTasksSync (): void {
    this.dispatchEvent(createBenchEvent('warmup'))
    for (const task of this._tasks.values()) {
      task.warmupSync()
    }
  }
}
