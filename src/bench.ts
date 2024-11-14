import pLimit from 'p-limit'

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
import { type JSRuntime, mToNs, now, runtime, runtimeVersion } from './utils'

/**
 * The Bench class keeps track of the benchmark tasks and controls them.
 */
export class Bench extends EventTarget {
  /**
   * the task map
   */
  private readonly _tasks = new Map<string, Task>()

  /**
   * Executes tasks concurrently based on the specified concurrency mode.
   *
   * - When `mode` is set to `null` (default), concurrency is disabled.
   * - When `mode` is set to 'task', each task's iterations (calls of a task function) run concurrently.
   * - When `mode` is set to 'bench', different tasks within the bench run concurrently. Concurrent cycles.
   */
  concurrency: 'bench' | 'task' | null = null

  iterations = defaultMinimumIterations

  /**
   * The benchmark name.
   */
  readonly name?: string

  readonly now = now

  /**
   * The JavaScript runtime environment.
   */
  readonly runtime: 'unknown' | JSRuntime

  /**
   * The JavaScript runtime version.
   */
  readonly runtimeVersion: string

  readonly setup: Hook

  readonly signal?: AbortSignal

  readonly teardown: Hook

  /**
   * The maximum number of concurrent tasks to run @default Number.POSITIVE_INFINITY
   */
  threshold = Number.POSITIVE_INFINITY

  throws = false

  time = defaultMinimumTime

  warmup = true

  warmupIterations = defaultMinimumWarmupIterations

  warmupTime = defaultMinimumWarmupTime

  constructor (options: Options = {}) {
    super()
    this.name = options.name
    this.runtime = runtime
    this.runtimeVersion = runtimeVersion
    this.now = options.now ?? this.now
    this.warmup = options.warmup ?? this.warmup
    this.warmupTime = options.warmupTime ?? this.warmupTime
    this.warmupIterations = options.warmupIterations ?? this.warmupIterations
    this.time = options.time ?? this.time
    this.iterations = options.iterations ?? this.iterations
    this.signal = options.signal
    this.throws = options.throws ?? this.throws
    this.setup = options.setup ?? emptyFunction
    this.teardown = options.teardown ?? emptyFunction

    if (this.signal) {
      this.signal.addEventListener(
        'abort',
        () => {
          this.dispatchEvent(createBenchEvent('abort'))
        },
        { once: true }
      )
    }
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
   * add a benchmark task to the task map
   * @param name - the task name
   * @param fn - the task function
   * @param opts - the task options
   * @returns the Bench instance
   */
  add (name: string, fn: Fn, opts: FnOptions = {}): this {
    const task = new Task(this, name, fn, opts)
    this._tasks.set(name, task)
    this.dispatchEvent(createBenchEvent('add', task))
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
   * @returns the task
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
   * reset each task and remove its result
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
    if (this.warmup) {
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
   * table of the tasks results
   * @param convert - an optional callback to convert the task result to a table record
   * @returns the tasks results as an array of table records
   */
  table (
    convert?: (task: Task) => Record<string, number | string> | undefined
  ): (null | Record<string, number | string> | undefined)[] {
    return this.tasks.map(task => {
      if (task.result) {
        return task.result.error
          ? {
              'Task name': task.name,
              // eslint-disable-next-line perfectionist/sort-objects
              Error: task.result.error.message,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              Stack: task.result.error.stack!,
            }
          : (convert?.(task) ?? {
              'Task name': task.name,
              // eslint-disable-next-line perfectionist/sort-objects
              'Latency average (ns)': `${mToNs(task.result.latency.mean).toFixed(2)} \xb1 ${task.result.latency.rme.toFixed(2)}%`,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              'Latency median (ns)': `${mToNs(task.result.latency.p50!).toFixed(2)}${Number.parseFloat(mToNs(task.result.latency.mad!).toFixed(2)) > 0 ? ` \xb1 ${mToNs(task.result.latency.mad!).toFixed(2)}` : ''}`,
              'Throughput average (ops/s)': `${task.result.throughput.mean.toFixed(0)} \xb1 ${task.result.throughput.rme.toFixed(2)}%`,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              'Throughput median (ops/s)': `${task.result.throughput.p50!.toFixed(0)}${Number.parseInt(task.result.throughput.mad!.toFixed(0), 10) > 0 ? ` \xb1 ${task.result.throughput.mad!.toFixed(0)}` : ''}`,
              // eslint-disable-next-line perfectionist/sort-objects
              Samples: task.result.latency.samples.length,
            })
      }
      return null
    })
  }

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
}
