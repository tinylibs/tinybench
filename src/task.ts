import type { Bench } from './bench'
import type {
  AddEventListenerOptionsArgument,
  EventListener,
  EventListenerObject,
  Fn,
  FnOptions,
  RemoveEventListenerOptionsArgument,
  TaskEvents,
  TaskResult,
  TaskResultRuntimeInfo,
} from './types'

import { BenchEvent } from './event'
import { withConcurrency } from './utils'
import {
  getStatisticsSorted,
  invariant,
  isFnAsyncResource,
  isPromiseLike,
  isValidSamples,
  type Samples,
  sortSamples,
  toError,
} from './utils'

const hookNames = ['afterAll', 'beforeAll', 'beforeEach', 'afterEach'] as const

const abortableStates = ['not-started', 'started'] as const

const notStartedTaskResult: TaskResult = { state: 'not-started' }
const abortedTaskResult: TaskResult = { state: 'aborted' }
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
   * The number of times the task function has been executed
   */
  runs = 0

  get name (): string {
    return this.#name
  }

  get result (): TaskResult & TaskResultRuntimeInfo {
    return {
      ...this.#result,
      runtime: this.#bench.runtime,
      runtimeVersion: this.#bench.runtimeVersion,
    }
  }

  /**
   * The task asynchronous status
   */
  readonly #async: boolean

  /**
   * The Bench instance reference
   */
  readonly #bench: Bench

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
   * The task-level abort signal
   */
  readonly #signal: AbortSignal | undefined

  /**
   * Check if either our signal or the bench-level signal is aborted
   * @returns `true` if either signal is aborted
   */
  get #aborted (): boolean {
    return this.#signal?.aborted === true || this.#bench.opts.signal?.aborted === true
  }

  constructor (bench: Bench, name: string, fn: Fn, fnOpts: FnOptions = {}) {
    super()
    this.#bench = bench
    this.#name = name
    this.#fn = fn
    this.#fnOpts = fnOpts
    this.#async = fnOpts.async ?? isFnAsyncResource(fn)
    this.#signal = fnOpts.signal

    for (const hookName of hookNames) {
      if (this.#fnOpts[hookName] != null) {
        invariant(
          typeof this.#fnOpts[hookName] === 'function',
          `'${hookName}' must be a function if provided`
        )
      }
    }

    if (this.#signal) {
      this.#signal.addEventListener(
        'abort',
        this.#onAbort.bind(this),
        { once: true }
      )
    }

    if (this.#bench.opts.signal) {
      this.#bench.opts.signal.addEventListener(
        'abort',
        this.#onAbort.bind(this),
        { once: true }
      )
    }

    this.reset(false)
  }

  /**
   * reset the task to make the `Task.runs` a zero-value and remove the `Task.result` object property
   * @param emit - whether to emit the `reset` event or not
   * @internal
   */
  reset (emit = true): void {
    if (emit) this.dispatchEvent(new BenchEvent('reset', this))
    this.runs = 0

    this.#result = this.#aborted ? abortedTaskResult : notStartedTaskResult
  }

  /**
   * run the current task and write the results in `Task.result` object property
   * @returns the current task
   * @internal
   */
  async run (): Promise<Task> {
    if (this.#result.state !== 'not-started') {
      return this
    }
    this.#result = { state: 'started' }
    this.dispatchEvent(new BenchEvent('start', this))
    await this.#bench.opts.setup(this, 'run')
    const { error, samples: latencySamples } = await this.#benchmark(
      'run',
      this.#bench.opts.time,
      this.#bench.opts.iterations
    )
    await this.#bench.opts.teardown(this, 'run')

    this.#processRunResult({ error, latencySamples })

    return this
  }

  /**
   * run the current task and write the results in `Task.result` object property (sync version)
   * @returns the current task
   * @internal
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

    const setupResult = this.#bench.opts.setup(this, 'run')
    invariant(
      !isPromiseLike(setupResult),
      '`setup` function must be sync when using `runSync()`'
    )

    const { error, samples: latencySamples } = this.#benchmarkSync(
      'run',
      this.#bench.opts.time,
      this.#bench.opts.iterations
    )

    const teardownResult = this.#bench.opts.teardown(this, 'run')
    invariant(
      !isPromiseLike(teardownResult),
      '`teardown` function must be sync when using `runSync()`'
    )

    this.#processRunResult({ error, latencySamples })

    return this
  }

  /**
   * warmup the current task
   * @internal
   */
  async warmup (): Promise<void> {
    if (this.#result.state !== 'not-started') {
      return
    }
    this.dispatchEvent(new BenchEvent('warmup', this))
    await this.#bench.opts.setup(this, 'warmup')
    const { error } = (await this.#benchmark(
      'warmup',
      this.#bench.opts.warmupTime,
      this.#bench.opts.warmupIterations
    ))
    await this.#bench.opts.teardown(this, 'warmup')

    this.#postWarmup(error)
  }

  /**
   * warmup the current task (sync version)
   * @internal
   */
  warmupSync (): void {
    if (this.#result.state !== 'not-started') {
      return
    }

    this.dispatchEvent(new BenchEvent('warmup', this))

    const setupResult = this.#bench.opts.setup(this, 'warmup')
    invariant(
      !isPromiseLike(setupResult),
      '`setup` function must be sync when using `runSync()`'
    )

    const { error } = this.#benchmarkSync(
      'warmup',
      this.#bench.opts.warmupTime,
      this.#bench.opts.warmupIterations
    )

    const teardownResult = this.#bench.opts.teardown(this, 'warmup')
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
  ): Promise<{ error: Error, samples?: never } | { error?: never, samples?: Samples }> {
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
          ({ taskTime } = await this.#measureOnce())
        } else {
          ({ taskTime } = this.#measureOnceSync())
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
          now: this.#bench.opts.now,
          signal: this.#signal ?? this.#bench.opts.signal,
          time,
        })
      } catch (error) {
        return { error: toError(error) }
      }
      this.runs = samples.length
    } else {
      try {
        while (
          // eslint-disable-next-line no-unmodified-loop-condition
          (totalTime < time ||
            samples.length < iterations) &&
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

    return isValidSamples(samples)
      ? { samples }
      : {}
  }

  #benchmarkSync (
    mode: 'run' | 'warmup',
    time: number,
    iterations: number
  ): { error: Error, samples?: never } | { error?: never, samples?: Samples } {
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

        const { taskTime } = this.#measureOnceSync()

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
        (totalTime < time ||
          samples.length < iterations) &&
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
    return isValidSamples(samples)
      ? { samples }
      : {}
  }

  async #measureOnce (): Promise<{ fnResult: ReturnType<Fn>, taskTime: number }> {
    const taskStart = this.#bench.opts.now()
    // eslint-disable-next-line no-useless-call
    const fnResult = await this.#fn.call(this)
    let taskTime = this.#bench.opts.now() - taskStart

    const overriddenDuration = getOverriddenDurationFromFnResult(fnResult)
    if (overriddenDuration !== undefined) {
      taskTime = overriddenDuration
    }
    return { fnResult, taskTime }
  }

  #measureOnceSync (): { fnResult: ReturnType<Fn>, taskTime: number } {
    const taskStart = this.#bench.opts.now()
    // eslint-disable-next-line no-useless-call
    const fnResult = this.#fn.call(this)
    let taskTime = this.#bench.opts.now() - taskStart

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

  #onAbort (): void {
    if (
      abortableStates.includes(this.#result.state as typeof abortableStates[number])
    ) {
      this.#result = abortedTaskResult
      const ev = new BenchEvent('abort', this)
      this.dispatchEvent(ev)
      this.#bench.dispatchEvent(ev)
    }
  }

  #postWarmup (error: Error | undefined): void {
    if (error) {
      /* eslint-disable perfectionist/sort-objects */
      this.#result = { state: 'errored', error }
      /* eslint-enable perfectionist/sort-objects */
      const ev = new BenchEvent('error', this, error)
      this.dispatchEvent(ev)
      this.#bench.dispatchEvent(ev)
      if (this.#bench.opts.throws) {
        throw error
      }
    }
  }

  #processRunResult ({
    error,
    latencySamples,
  }: {
    error?: Error
    latencySamples?: number[]
  }): void {
    if (isValidSamples(latencySamples)) {
      this.runs = latencySamples.length

      sortSamples(latencySamples)

      const latencyStatistics = getStatisticsSorted(latencySamples)
      const latencyStatisticsMean = latencyStatistics.mean

      let totalTime = 0
      const throughputSamples = [] as unknown as Samples

      for (const sample of latencySamples) {
        if (sample !== 0) {
          totalTime += sample
          throughputSamples.push(1000 / sample)
        } else {
          throughputSamples.push(latencyStatisticsMean === 0 ? 0 : 1000 / latencyStatisticsMean)
        }
      }

      sortSamples(throughputSamples)
      const throughputStatistics = getStatisticsSorted(throughputSamples)

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
      if (this.#bench.opts.throws) {
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
 * @param fnResult - the result of the task function.
 * @returns the overridden duration if defined by the function.
 */
function getOverriddenDurationFromFnResult (
  fnResult: ReturnType<Fn>
): number | undefined {
  return (
    fnResult != null &&
    typeof fnResult === 'object' &&
    'overriddenDuration' in fnResult &&
    typeof fnResult.overriddenDuration === 'number' &&
    Number.isFinite(fnResult.overriddenDuration) &&
    fnResult.overriddenDuration >= 0
  )
    ? fnResult.overriddenDuration
    : undefined
}
