import type {
  AddEventListenerOptionsArgument,
  BenchLike,
  EventListener,
  EventListenerObject,
  Fn,
  FnOptions,
  RemoveEventListenerOptionsArgument,
  Samples,
  TaskEvents,
  TaskResult,
  TaskResultRuntimeInfo,
} from './types'

import { BenchEvent } from './event'
import {
  getStatisticsSorted,
  invariant,
  isFnAsyncResource,
  isPromiseLike,
  isValidSamples,
  sortSamples,
  toError,
  withConcurrency,
} from './utils'

/**
 * The names of all supported task lifecycle hooks.
 */
const hookNames = ['afterAll', 'beforeAll', 'beforeEach', 'afterEach'] as const

/**
 * Task states that can be aborted.
 */
const abortableStates = ['not-started', 'started'] as const

/**
 * Default task result for tasks that have not yet started.
 */
const notStartedTaskResult: TaskResult = { state: 'not-started' }

/**
 * Default task result for tasks that have been aborted.
 */
const abortedTaskResult: TaskResult = { state: 'aborted' }

/**
 * Default task result for tasks that have started running.
 */
const startedTaskResult: TaskResult = { state: 'started' }

/**
 * A class that represents each benchmark task in Tinybench. It keeps track of the
 * results, name, the task function, the number times the task function has been executed, ...
 */
export class Task extends EventTarget {
  declare addEventListener: <K extends TaskEvents>(
    type: K,
    listener: EventListener<K, 'task'> | EventListenerObject<K, 'task'> | null,
    options?: AddEventListenerOptionsArgument
  ) => void

  declare removeEventListener: <K extends TaskEvents>(
    type: K,
    listener: EventListener<K, 'task'> | EventListenerObject<K, 'task'> | null,
    options?: RemoveEventListenerOptionsArgument
  ) => void

  /**
   * The name of the task.
   * @returns The task name as a string
   */
  get name (): string {
    return this.#name
  }

  /**
   * The result of the task.
   * @returns The task result including state, statistics, and runtime information
   */
  get result (): TaskResult & TaskResultRuntimeInfo {
    return {
      ...this.#result,
      runtime: this.#bench.runtime,
      runtimeVersion: this.#bench.runtimeVersion,
    }
  }

  /**
   * The number of times the task function has been executed.
   * @returns The total number of executions performed
   */
  get runs (): number {
    return this.#runs
  }

  /**
   * Check if either our signal or the bench-level signal is aborted.
   */
  #aborted = false

  /**
   * The task asynchronous status
   */
  readonly #async: boolean

  /**
   * The Bench instance reference
   */
  readonly #bench: BenchLike

  /**
   * The task function
   */
  readonly #fn: Fn

  /**
   * The task function options
   */
  readonly #fnOpts: Readonly<FnOptions>

  /**
   * The task name
   */
  readonly #name: string

  /**
   * The result object
   */
  #result: TaskResult = notStartedTaskResult

  /**
   * Retain samples
   */
  readonly #retainSamples: boolean

  /**
   * The number of times the task function has been executed
   */
  #runs = 0

  /**
   * The task-level abort signal
   */
  readonly #signal: AbortSignal | undefined

  constructor (bench: BenchLike, name: string, fn: Fn, fnOpts: FnOptions = {}) {
    super()
    this.#bench = bench
    this.#name = name
    this.#fn = fn
    this.#fnOpts = fnOpts
    this.#async = fnOpts.async ?? isFnAsyncResource(fn)
    this.#signal = fnOpts.signal
    this.#retainSamples = fnOpts.retainSamples ?? bench.retainSamples

    for (const hookName of hookNames) {
      if (this.#fnOpts[hookName] != null) {
        invariant(
          typeof this.#fnOpts[hookName] === 'function',
          `'${hookName}' must be a function if provided`
        )
      }
    }

    this.reset(false)

    if (this.#signal) {
      if (this.#signal.aborted) {
        this.#onAbort()
      } else {
        this.#signal.addEventListener('abort', this.#onAbort.bind(this), {
          once: true,
        })
      }
    }

    if (this.#bench.signal) {
      if (this.#bench.signal.aborted) {
        this.#onAbort()
      } else {
        this.#bench.signal.addEventListener('abort', this.#onAbort.bind(this), {
          once: true,
        })
      }
    }
  }

  /**
   * Resets the task to make the `Task.runs` a zero-value and remove the `Task.result` object property.
   * @param emit - whether to emit the `reset` event or not
   */
  reset (emit = true): void {
    this.#runs = 0
    this.#result = this.#aborted ? abortedTaskResult : notStartedTaskResult

    if (emit) this.dispatchEvent(new BenchEvent('reset', this))
  }

  /**
   * Runs the current task and writes the results in `Task.result` object property.
   * @returns the current task
   */
  async run (): Promise<Task> {
    if (this.#result.state !== 'not-started') {
      return this
    }
    this.#result = { state: 'started' }
    this.dispatchEvent(new BenchEvent('start', this))
    await this.#bench.setup(this, 'run')
    const { error, samples: latencySamples } = await this.#benchmark(
      'run',
      this.#bench.time,
      this.#bench.iterations
    )
    await this.#bench.teardown(this, 'run')

    this.#processRunResult({ error, latencySamples })

    return this
  }

  /**
   * Runs the current task synchronously and writes the results in `Task.result` object property.
   * @returns the current task
   */
  runSync (): this {
    if (this.#result.state !== 'not-started') {
      return this
    }

    invariant(
      this.#bench.concurrency === null,
      'Cannot use `concurrency` option when using `runSync`'
    )
    this.#result = startedTaskResult
    this.dispatchEvent(new BenchEvent('start', this))

    const setupResult = this.#bench.setup(this, 'run')
    invariant(
      !isPromiseLike(setupResult),
      '`setup` function must be sync when using `runSync()`'
    )

    const { error, samples: latencySamples } = this.#benchmarkSync(
      'run',
      this.#bench.time,
      this.#bench.iterations
    )

    const teardownResult = this.#bench.teardown(this, 'run')
    invariant(
      !isPromiseLike(teardownResult),
      '`teardown` function must be sync when using `runSync()`'
    )

    this.#processRunResult({ error, latencySamples })

    return this
  }

  /**
   * Warms up the current task.
   */
  async warmup (): Promise<void> {
    if (this.#result.state !== 'not-started') {
      return
    }
    this.dispatchEvent(new BenchEvent('warmup', this))
    await this.#bench.setup(this, 'warmup')
    const { error } = await this.#benchmark(
      'warmup',
      this.#bench.warmupTime,
      this.#bench.warmupIterations
    )
    await this.#bench.teardown(this, 'warmup')

    this.#postWarmup(error)
  }

  /**
   * Warms up the current task synchronously.
   */
  warmupSync (): void {
    if (this.#result.state !== 'not-started') {
      return
    }

    this.dispatchEvent(new BenchEvent('warmup', this))

    const setupResult = this.#bench.setup(this, 'warmup')
    invariant(
      !isPromiseLike(setupResult),
      '`setup` function must be sync when using `runSync()`'
    )

    const { error } = this.#benchmarkSync(
      'warmup',
      this.#bench.warmupTime,
      this.#bench.warmupIterations
    )

    const teardownResult = this.#bench.teardown(this, 'warmup')
    invariant(
      !isPromiseLike(teardownResult),
      '`teardown` function must be sync when using `runSync()`'
    )

    this.#postWarmup(error)
  }

  async #benchmark (
    mode: 'run' | 'warmup',
    time: number,
    iterations: number
  ): Promise<
    { error: Error; samples?: never } | { error?: never; samples?: Samples }
  > {
    if (this.#fnOpts.beforeAll) {
      try {
        await this.#fnOpts.beforeAll.call(this, mode)
      } catch (error) {
        return { error: toError(error) }
      }
    }

    let totalTime = 0 // ms
    const samples: number[] = []

    const benchmarkTask = async () => {
      if (this.#aborted) {
        return
      }
      try {
        if (this.#fnOpts.beforeEach != null) {
          await this.#fnOpts.beforeEach.call(this, mode)
        }

        let taskTime: number
        if (this.#async) {
          ({ taskTime } = await this.#measure())
        } else {
          ({ taskTime } = this.#measureSync())
        }

        samples.push(taskTime)
        totalTime += taskTime
      } finally {
        if (this.#fnOpts.afterEach != null) {
          await this.#fnOpts.afterEach.call(this, mode)
        }
      }
    }
    if (this.#bench.concurrency === 'task') {
      try {
        await withConcurrency({
          fn: benchmarkTask,
          iterations,
          limit: Math.max(1, Math.floor(this.#bench.threshold)),
          signal: this.#signal ?? this.#bench.signal,
          time,
          timestamp: this.#bench.timestamp,
        })
      } catch (error) {
        return { error: toError(error) }
      }
      this.#runs = samples.length
    } else {
      try {
        while (
          // eslint-disable-next-line no-unmodified-loop-condition
          (totalTime < time || samples.length < iterations) &&
          !this.#aborted
        ) {
          await benchmarkTask()
        }
      } catch (error) {
        return { error: toError(error) }
      }
    }

    if (this.#fnOpts.afterAll != null) {
      try {
        await this.#fnOpts.afterAll.call(this, mode)
      } catch (error) {
        return { error: toError(error) }
      }
    }

    return isValidSamples(samples) ? { samples } : {}
  }

  /**
   * @param mode - 'run' | 'warmup'
   * @param time - the amount of time to run the benchmark
   * @param iterations - the amount of iterations to run the benchmark
   * @returns the error if any, and the samples if any
   */
  #benchmarkSync (
    mode: 'run' | 'warmup',
    time: number,
    iterations: number
  ): { error: Error; samples?: never } | { error?: never; samples?: Samples } {
    if (this.#fnOpts.beforeAll) {
      try {
        const beforeAllResult = this.#fnOpts.beforeAll.call(this, mode)
        invariant(
          !isPromiseLike(beforeAllResult),
          '`beforeAll` function must be sync when using `runSync()`'
        )
      } catch (error) {
        return { error: toError(error) }
      }
    }

    let totalTime = 0
    const samples: number[] = []

    const benchmarkTask = () => {
      if (this.#aborted) {
        return
      }
      try {
        if (this.#fnOpts.beforeEach) {
          const beforeEachResult = this.#fnOpts.beforeEach.call(this, mode)
          invariant(
            !isPromiseLike(beforeEachResult),
            '`beforeEach` function must be sync when using `runSync()`'
          )
        }

        const { taskTime } = this.#measureSync()

        samples.push(taskTime)
        totalTime += taskTime
      } finally {
        if (this.#fnOpts.afterEach) {
          const afterEachResult = this.#fnOpts.afterEach.call(this, mode)
          invariant(
            !isPromiseLike(afterEachResult),
            '`afterEach` function must be sync when using `runSync()`'
          )
        }
      }
    }

    try {
      while (
        // eslint-disable-next-line no-unmodified-loop-condition
        (totalTime < time || samples.length < iterations) &&
        !this.#aborted
      ) {
        benchmarkTask()
      }
    } catch (error) {
      return { error: toError(error) }
    }

    if (this.#fnOpts.afterAll) {
      try {
        const afterAllResult = this.#fnOpts.afterAll.call(this, mode)
        invariant(
          !isPromiseLike(afterAllResult),
          '`afterAll` function must be sync when using `runSync()`'
        )
      } catch (error) {
        return { error: toError(error) }
      }
    }
    return isValidSamples(samples) ? { samples } : {}
  }

  /**
   * Measures a single execution of the task function asynchronously.
   * @returns An object containing the function result and the measured execution time
   */
  async #measure (): Promise<{
    fnResult: ReturnType<Fn>
    taskTime: number
  }> {
    const now = this.#bench.timestamp.fn
    const taskStart = now() as unknown as number
    // eslint-disable-next-line no-useless-call
    const fnResult = await this.#fn.call(this)
    let taskTime = this.#bench.timestamp.toMs((now() as unknown as number) - taskStart)

    const overriddenDuration = getOverriddenDurationFromFnResult(fnResult)
    if (overriddenDuration !== undefined) {
      taskTime = overriddenDuration
    }
    return { fnResult, taskTime }
  }

  /**
   * Measures a single execution of the task function synchronously.
   * @returns An object containing the function result and the measured execution time
   */
  #measureSync (): { fnResult: ReturnType<Fn>; taskTime: number } {
    const now = this.#bench.timestamp.fn
    const taskStart = now() as unknown as number
    // eslint-disable-next-line no-useless-call
    const fnResult = this.#fn.call(this)
    let taskTime = this.#bench.timestamp.toMs(now() as unknown as number - taskStart)

    invariant(
      !isPromiseLike(fnResult),
      'task function must be sync when using `runSync()`'
    )
    const overriddenDuration = getOverriddenDurationFromFnResult(fnResult)
    if (overriddenDuration !== undefined) {
      taskTime = overriddenDuration
    }
    return { fnResult, taskTime }
  }

  /**
   * Handles the abort event from either the task-level or bench-level signal.
   * Sets the task result to aborted if the task is in an abortable state.
   */
  #onAbort (): void {
    this.#aborted = true
    if (
      abortableStates.includes(
        this.#result.state as (typeof abortableStates)[number]
      )
    ) {
      this.#result = abortedTaskResult
      const ev = new BenchEvent('abort', this)
      this.dispatchEvent(ev)
      this.#bench.dispatchEvent(ev)
    }
  }

  /**
   * Processes the result of the warmup phase.
   * Dispatches an error event if the warmup encountered an error.
   * @param error - The error that occurred during warmup, if any
   */
  #postWarmup (error: Error | undefined): void {
    if (error) {
      /* eslint-disable perfectionist/sort-objects */
      this.#result = { state: 'errored', error }
      /* eslint-enable perfectionist/sort-objects */
      const ev = new BenchEvent('error', this, error)
      this.dispatchEvent(ev)
      this.#bench.dispatchEvent(ev)
      if (this.#bench.throws) {
        throw error
      }
    }
  }

  /**
   * Processes the result of a benchmark run and updates the task result.
   * Calculates statistics from the collected samples and dispatches appropriate events.
   * @param options - An object containing the error and latency samples from the run
   * @param options.error - The error that occurred during the run, if any
   * @param options.latencySamples - The array of latency samples collected during the run
   */
  #processRunResult ({
    error,
    latencySamples,
  }: {
    error?: Error
    latencySamples?: number[]
  }): void {
    if (isValidSamples(latencySamples)) {
      this.#runs = latencySamples.length

      sortSamples(latencySamples)

      const latencyStatistics = getStatisticsSorted(latencySamples, this.#retainSamples)
      const latencyStatisticsMean = latencyStatistics.mean

      let totalTime = 0
      const throughputSamples: Samples | undefined = [] as unknown as Samples

      for (const sample of latencySamples) {
        if (sample !== 0) {
          totalTime += sample
          throughputSamples.push(1000 / sample)
        } else {
          throughputSamples.push(
            latencyStatisticsMean === 0 ? 0 : 1000 / latencyStatisticsMean
          )
        }
      }

      sortSamples(throughputSamples)
      const throughputStatistics = getStatisticsSorted(throughputSamples, this.#retainSamples)

      /* eslint-disable perfectionist/sort-objects */
      this.#result = {
        state: this.#aborted ? 'aborted-with-statistics' : 'completed',
        latency: latencyStatistics,
        period: totalTime / this.runs,
        throughput: throughputStatistics,
        totalTime,
      }
      /* eslint-enable perfectionist/sort-objects */
    } else if (this.#aborted) {
      // If aborted with no samples, still set the aborted flag
      this.#result = abortedTaskResult
    }

    if (error) {
      /* eslint-disable perfectionist/sort-objects */
      this.#result = {
        state: 'errored',
        error,
      }
      /* eslint-enable perfectionist/sort-objects */
      const ev = new BenchEvent('error', this, error)
      this.dispatchEvent(ev)
      this.#bench.dispatchEvent(ev)
      if (this.#bench.throws) {
        throw error
      }
    }

    const ev = new BenchEvent('cycle', this)
    this.dispatchEvent(ev)
    this.#bench.dispatchEvent(ev)
    // cycle and complete are equal in Task
    this.dispatchEvent(new BenchEvent('complete', this))
  }
}

/**
 * Extracts the overridden duration from a task function result if present.
 * @param fnResult - The result of the task function
 * @returns The overridden duration in milliseconds if defined by the function, otherwise undefined
 */
function getOverriddenDurationFromFnResult (
  fnResult: ReturnType<Fn>
): number | undefined {
  return fnResult != null &&
    typeof fnResult === 'object' &&
    'overriddenDuration' in fnResult &&
    typeof fnResult.overriddenDuration === 'number' &&
    Number.isFinite(fnResult.overriddenDuration) &&
    fnResult.overriddenDuration >= 0
    ? fnResult.overriddenDuration
    : undefined
}
