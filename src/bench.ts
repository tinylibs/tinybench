import type {
  AddEventListenerOptionsArgument,
  BenchEvents,
  BenchLike,
  BenchOptions,
  EventListener,
  EventListenerObject,
  Fn,
  FnOptions,
  JSRuntime,
  RemoveEventListenerOptionsArgument,
  TaskResult,
} from './types'

import {
  defaultMinimumIterations as defaultIterations,
  defaultMinimumWarmupTime,
  defaultMinimumTime as defaultTime,
  defaultMinimumWarmupIterations as defaultWarmupIterations,
  emptyFunction,
} from './constants'
import { BenchEvent } from './event'
import { Task } from './task'
import {
  defaultConvertTaskResultForConsoleTable,
  invariant,
  performanceNow,
  runtime,
  runtimeVersion,
} from './utils'

/**
 * The Bench class keeps track of the benchmark tasks and controls them.
 */
export class Bench extends EventTarget implements BenchLike {
  declare addEventListener: <K extends BenchEvents>(
    type: K,
    listener: EventListener<K> | EventListenerObject<K> | null,
    options?: AddEventListenerOptionsArgument
  ) => void

  /**
   * Executes tasks concurrently based on the specified concurrency mode.
   *
   * - When `mode` is set to `null` (default), concurrency is disabled.
   * - When `mode` is set to 'task', each task's iterations (calls of a task function) run concurrently.
   * - When `mode` is set to 'bench', different tasks within the bench run concurrently.
   */
  readonly concurrency: 'bench' | 'task' | null = null

  /**
   * The amount of executions per task.
   */
  readonly iterations: number

  /**
   * The benchmark name.
   */
  readonly name: string | undefined

  /**
   * A function to get a timestamp.
   */
  readonly now: () => number

  /**
   * Removes a previously registered event listener.
   */
  declare removeEventListener: <K extends BenchEvents>(
    type: K,
    listener: EventListener<K> | EventListenerObject<K> | null,
    options?: RemoveEventListenerOptionsArgument
  ) => void

  /**
   * The JavaScript runtime environment.
   */
  readonly runtime: JSRuntime

  /**
   * The JavaScript runtime version.
   */
  readonly runtimeVersion: string

  /**
   * A setup function that runs before each task execution.
   */
  readonly setup: (task: Task, mode: 'run' | 'warmup') => Promise<void> | void

  /**
   * An AbortSignal to cancel the benchmark.
   */
  readonly signal: AbortSignal | undefined

  /**
   * A teardown function that runs after each task execution.
   */
  readonly teardown: (
    task: Task,
    mode: 'run' | 'warmup'
  ) => Promise<void> | void

  /**
   * The maximum number of concurrent tasks to run
   * @default Number.POSITIVE_INFINITY
   */
  readonly threshold = Number.POSITIVE_INFINITY

  /**
   * Whether to throw an error if a task function throws
   * @default false
   */
  readonly throws: boolean

  /**
   * The amount of time to run each task.
   */
  readonly time: number

  /**
   * Whether to warmup the tasks before running them
   */
  readonly warmup: boolean

  /**
   * The amount of warmup iterations per task.
   */
  readonly warmupIterations: number

  /**
   * The amount of time to warmup each task.
   */
  readonly warmupTime: number

  /**
   * The tasks results as an array.
   * @returns the tasks results
   */
  get results (): Readonly<TaskResult>[] {
    return this.tasks.map(task => task.result)
  }

  /**
   * The tasks as an array.
   * @returns An array containing all benchmark tasks
   */
  get tasks (): Task[] {
    return [...this.#tasks.values()]
  }

  /**
   * The task map
   */
  readonly #tasks = new Map<string, Task>()

  constructor (options: BenchOptions = {}) {
    super()
    const { name, ...restOptions } = options
    this.name = name
    this.runtime = runtime
    this.runtimeVersion = runtimeVersion
    this.concurrency = restOptions.concurrency ?? null
    this.threshold = restOptions.threshold ?? Number.POSITIVE_INFINITY

    this.time = restOptions.time ?? defaultTime
    this.iterations = restOptions.iterations ?? defaultIterations
    this.now = restOptions.now ?? performanceNow
    this.warmup = restOptions.warmup ?? true
    this.warmupIterations =
      restOptions.warmupIterations ?? defaultWarmupIterations
    this.warmupTime = restOptions.warmupTime ?? defaultMinimumWarmupTime
    this.setup = restOptions.setup ?? emptyFunction
    this.teardown = restOptions.teardown ?? emptyFunction
    this.throws = restOptions.throws ?? false
    this.signal = restOptions.signal

    if (this.signal) {
      this.signal.addEventListener(
        'abort',
        () => {
          this.dispatchEvent(new BenchEvent('abort'))
        },
        { once: true }
      )
    }
  }

  /**
   * Adds a benchmark task to the task map.
   * @param name - the task name
   * @param fn - the task function
   * @param fnOpts - the task function options
   * @returns the Bench instance
   * @throws {Error} when a task with the same name already exists
   */
  add (name: string, fn: Fn, fnOpts: FnOptions = {}): this {
    if (!this.#tasks.has(name)) {
      const task = new Task(this, name, fn, fnOpts)
      this.#tasks.set(name, task)
      this.dispatchEvent(new BenchEvent('add', task))
    } else {
      throw new Error(`Task "${name}" already exists`)
    }
    return this
  }

  /**
   * Gets a task based on the task name.
   * @param name - the task name
   * @returns the Task instance or undefined if not found
   */
  getTask (name: string): Task | undefined {
    return this.#tasks.get(name)
  }

  /**
   * Removes a benchmark task from the task map.
   * @param name - the task name
   * @returns the Bench instance
   */
  remove (name: string): this {
    const task = this.getTask(name)
    if (task) {
      this.#tasks.delete(name)
      this.dispatchEvent(new BenchEvent('remove', task))
    }
    return this
  }

  /**
   * Resets all tasks and removes their results.
   */
  reset (): void {
    for (const task of this.#tasks.values()) {
      task.reset()
    }
    this.dispatchEvent(new BenchEvent('reset'))
  }

  /**
   * Runs the added benchmark tasks.
   * @returns the tasks array
   */
  async run (): Promise<Task[]> {
    if (this.warmup) {
      await this.#warmupTasks()
    }

    this.dispatchEvent(new BenchEvent('start'))

    let values: Task[] = []

    if (this.concurrency === 'bench') {
      const taskPromises = []
      for (const task of this.#tasks.values()) {
        taskPromises.push(task.run())
      }
      values = await Promise.all(taskPromises)
    } else {
      for (const task of this.#tasks.values()) {
        values.push(await task.run())
      }
    }

    this.dispatchEvent(new BenchEvent('complete'))
    return values
  }

  /**
   * Runs the added benchmark tasks synchronously.
   * @returns the tasks array
   */
  runSync (): Task[] {
    invariant(
      this.concurrency === null,
      'Cannot use `concurrency` option when using `runSync`'
    )
    if (this.warmup) {
      this.#warmupTasksSync()
    }
    const values: Task[] = []
    this.dispatchEvent(new BenchEvent('start'))
    for (const task of this.#tasks.values()) {
      values.push(task.runSync())
    }
    this.dispatchEvent(new BenchEvent('complete'))
    return values
  }

  /**
   * Returns the tasks results as a table.
   * @param convert - an optional callback to convert the task result to a table record
   * @returns the tasks results as an array of table records
   */
  table (
    convert = defaultConvertTaskResultForConsoleTable
  ): (null | Record<string, number | string | undefined>)[] {
    return this.tasks.map(convert)
  }

  /**
   * Warms up the benchmark tasks.
   */
  async #warmupTasks (): Promise<void> {
    this.dispatchEvent(new BenchEvent('warmup'))

    if (this.concurrency === 'bench') {
      const taskPromises = []
      for (const task of this.#tasks.values()) {
        taskPromises.push(task.warmup())
      }
      await Promise.all(taskPromises)
    } else {
      for (const task of this.#tasks.values()) {
        await task.warmup()
      }
    }
  }

  /**
   * Warms up the benchmark tasks synchronously.
   */
  #warmupTasksSync (): void {
    this.dispatchEvent(new BenchEvent('warmup'))
    for (const task of this.#tasks.values()) {
      task.warmupSync()
    }
  }
}
