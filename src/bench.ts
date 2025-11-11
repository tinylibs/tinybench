import type {
  AddEventListenerOptionsArgument,
  BenchEvents,
  BenchLike,
  BenchOptions,
  EventListener,
  EventListenerObject,
  Fn,
  FnOptions,
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
  type JSRuntime,
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

  readonly iterations: number

  /**
   * The benchmark name.
   */
  readonly name: string | undefined

  readonly now: () => number

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

  readonly setup: (task: Task, mode: 'run' | 'warmup') => Promise<void> | void

  readonly signal: AbortSignal | undefined

  readonly teardown: (task: Task, mode: 'run' | 'warmup') => Promise<void> | void

  /**
   * The maximum number of concurrent tasks to run
   * @default Infinity
   */
  readonly threshold = Infinity

  readonly throws: boolean

  readonly time: number

  readonly warmup: boolean

  readonly warmupIterations: number

  readonly warmupTime: number

  /**
   * tasks results as an array
   * @returns the tasks results as an array
   */
  get results (): Readonly<TaskResult>[] {
    return this.tasks.map(task => task.result)
  }

  /**
   * tasks as an array
   * @returns the tasks as an array
   */
  get tasks (): Task[] {
    return [...this.#tasks.values()]
  }

  /**
   * the task map
   */
  readonly #tasks = new Map<string, Task>()

  constructor (options: BenchOptions = {}) {
    super()
    const { name, ...restOptions } = options
    this.name = name
    this.runtime = runtime
    this.runtimeVersion = runtimeVersion
    this.concurrency = restOptions.concurrency ?? null
    this.threshold = restOptions.threshold ?? Infinity

    this.time = restOptions.time ?? defaultTime
    this.iterations = restOptions.iterations ?? defaultIterations
    this.now = restOptions.now ?? performanceNow
    this.warmup = restOptions.warmup ?? true
    this.warmupIterations =
      restOptions.warmupIterations ?? defaultWarmupIterations
    this.warmupTime =
      restOptions.warmupTime ?? defaultMinimumWarmupTime
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
   * add a benchmark task to the task map
   * @param name - the task name
   * @param fn - the task function
   * @param fnOpts - the task function options
   * @returns the Bench instance
   * @throws {Error} if the task already exists
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
   * get a task based on the task name
   * @param name - the task name
   * @returns the Task instance
   */
  getTask (name: string): Task | undefined {
    return this.#tasks.get(name)
  }

  /**
   * remove a benchmark task from the task map
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
   * reset tasks and remove their result
   */
  reset (): void {
    for (const task of this.#tasks.values()) {
      task.reset()
    }
    this.dispatchEvent(new BenchEvent('reset'))
  }

  /**
   * run the added tasks that were registered using the {@link add} method
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
   * run the added tasks that were registered using the {@link add} method (sync version)
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
   * table of the tasks results
   * @param convert - an optional callback to convert the task result to a table record
   * @returns the tasks results as an array of table records
   */
  table (
    convert = defaultConvertTaskResultForConsoleTable
  ): (null | Record<string, number | string | undefined>)[] {
    return this.tasks.map(convert)
  }

  /**
   * warmup the benchmark tasks.
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
   * warmup the benchmark tasks (sync version)
   */
  #warmupTasksSync (): void {
    this.dispatchEvent(new BenchEvent('warmup'))
    for (const task of this.#tasks.values()) {
      task.warmupSync()
    }
  }
}
