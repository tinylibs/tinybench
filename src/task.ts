import pLimit from 'p-limit'

import type { Bench } from './bench'
import type {
  AddEventListenerOptionsArgument,
  Fn,
  FnOptions,
  RemoveEventListenerOptionsArgument,
  TaskEvents,
  TaskEventsMap,
  TaskResult,
  TaskResultRuntimeInfo,
} from './types'

import { createBenchEvent, createErrorEvent } from './event'
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

/**
 * A class that represents each benchmark task in Tinybench. It keeps track of the
 * results, name, the task function, the number times the task function has been executed, ...
 */
export class Task extends EventTarget {
  /**
   * The task name
   */
  readonly name: string

  /**
   * The result object
   */
  result: Readonly<TaskResult & TaskResultRuntimeInfo> = {
    runtime: 'unknown',
    runtimeVersion: 'unknown',
    state: 'not-started',
  }

  /**
   * The number of times the task function has been executed
   */
  runs = 0

  /**
   * The task asynchronous status
   */
  private readonly async: boolean

  /**
   * The Bench instance reference
   */
  private readonly bench: Bench

  /**
   * The task function
   */
  private readonly fn: Fn

  /**
   * The task function options
   */
  private readonly fnOpts: Readonly<FnOptions>

  /**
   * The task-level abort signal
   */
  private readonly signal: AbortSignal | undefined

  constructor (bench: Bench, name: string, fn: Fn, fnOpts: FnOptions = {}) {
    super()
    this.bench = bench
    this.name = name
    this.fn = fn
    this.fnOpts = fnOpts
    this.async = fnOpts.async ?? isFnAsyncResource(fn)
    this.signal = fnOpts.signal

    if (this.signal) {
      this.signal.addEventListener(
        'abort',
        () => {
          this.dispatchEvent(createBenchEvent('abort', this))
          this.bench.dispatchEvent(createBenchEvent('abort', this))
        },
        { once: true }
      )
    }

    this.setTaskResult({
      state: 'not-started',
    })
  }

  override addEventListener<K extends TaskEvents>(
    type: K,
    listener: TaskEventsMap[K],
    options?: AddEventListenerOptionsArgument
  ): void {
    super.addEventListener(type, listener, options)
  }

  override removeEventListener<K extends TaskEvents>(
    type: K,
    listener: TaskEventsMap[K],
    options?: RemoveEventListenerOptionsArgument
  ): void {
    super.removeEventListener(type, listener, options)
  }

  /**
   * reset the task to make the `Task.runs` a zero-value and remove the `Task.result` object property
   * @internal
   */
  reset (): void {
    this.dispatchEvent(createBenchEvent('reset', this))
    this.runs = 0

    this.setTaskResult({
      state: 'not-started',
    })
  }

  /**
   * run the current task and write the results in `Task.result` object property
   * @returns the current task
   * @internal
   */
  async run (): Promise<Task> {
    if (this.result.state !== 'not-started') {
      return this
    }
    this.setTaskResult({
      state: 'started',
    })
    this.dispatchEvent(createBenchEvent('start', this))
    await this.bench.opts.setup(this, 'run')
    const { error, samples: latencySamples } = (await this.benchmark(
      'run',
      this.bench.opts.time,
      this.bench.opts.iterations
    ))
    await this.bench.opts.teardown(this, 'run')

    this.processRunResult({ error, latencySamples })

    return this
  }

  /**
   * run the current task and write the results in `Task.result` object property (sync version)
   * @returns the current task
   * @internal
   */
  runSync (): this {
    if (this.result.state !== 'not-started') {
      return this
    }

    invariant(
      this.bench.concurrency === null,
      'Cannot use `concurrency` option when using `runSync`'
    )
    this.dispatchEvent(createBenchEvent('start', this))

    const setupResult = this.bench.opts.setup(this, 'run')
    invariant(
      !isPromiseLike(setupResult),
      '`setup` function must be sync when using `runSync()`'
    )

    const { error, samples: latencySamples } = this.benchmarkSync(
      'run',
      this.bench.opts.time,
      this.bench.opts.iterations
    )

    const teardownResult = this.bench.opts.teardown(this, 'run')
    invariant(
      !isPromiseLike(teardownResult),
      '`teardown` function must be sync when using `runSync()`'
    )

    this.processRunResult({ error, latencySamples })

    return this
  }

  /**
   * warmup the current task
   * @internal
   */
  async warmup (): Promise<void> {
    if (this.result.state !== 'not-started') {
      return
    }
    this.dispatchEvent(createBenchEvent('warmup', this))
    await this.bench.opts.setup(this, 'warmup')
    const { error } = (await this.benchmark(
      'warmup',
      this.bench.opts.warmupTime,
      this.bench.opts.warmupIterations
    ))
    await this.bench.opts.teardown(this, 'warmup')

    this.postWarmup(error)
  }

  /**
   * warmup the current task (sync version)
   * @internal
   */
  warmupSync (): void {
    if (this.result.state !== 'not-started') {
      return
    }

    this.dispatchEvent(createBenchEvent('warmup', this))

    const setupResult = this.bench.opts.setup(this, 'warmup')
    invariant(
      !isPromiseLike(setupResult),
      '`setup` function must be sync when using `runSync()`'
    )

    const { error } = this.benchmarkSync(
      'warmup',
      this.bench.opts.warmupTime,
      this.bench.opts.warmupIterations
    )

    const teardownResult = this.bench.opts.teardown(this, 'warmup')
    invariant(
      !isPromiseLike(teardownResult),
      '`teardown` function must be sync when using `runSync()`'
    )

    this.postWarmup(error)
  }

  private async benchmark (
    mode: 'run' | 'warmup',
    time: number,
    iterations: number
  ): Promise<{ error: Error, samples?: never } | { error?: never, samples?: Samples }> {
    if (this.fnOpts.beforeAll != null) {
      try {
        await this.fnOpts.beforeAll.call(this, mode)
      } catch (error) {
        return { error: toError(error) }
      }
    }

    let totalTime = 0 // ms
    const samples: number[] = []

    const benchmarkTask = async () => {
      if (this.isAborted()) {
        return
      }
      try {
        if (this.fnOpts.beforeEach != null) {
          await this.fnOpts.beforeEach.call(this, mode)
        }

        let taskTime: number
        if (this.async) {
          ({ taskTime } = await this.measureOnce())
        } else {
          ({ taskTime } = this.measureOnceSync())
        }

        samples.push(taskTime)
        totalTime += taskTime
      } finally {
        if (this.fnOpts.afterEach != null) {
          await this.fnOpts.afterEach.call(this, mode)
        }
      }
    }

    try {
      const promises: Promise<void>[] = [] // only for task level concurrency
      let limit: ReturnType<typeof pLimit> | undefined // only for task level concurrency

      if (this.bench.concurrency === 'task') {
        limit = pLimit(Math.max(1, Math.floor(this.bench.threshold)))
      }

      while (
        // eslint-disable-next-line no-unmodified-loop-condition
        (totalTime < time ||
          samples.length + (limit?.activeCount ?? 0) + (limit?.pendingCount ?? 0) < iterations) &&
          !this.isAborted()
      ) {
        if (this.bench.concurrency === 'task') {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          promises.push((limit!)(benchmarkTask))
        } else {
          await benchmarkTask()
        }
      }
      if (!this.isAborted() && promises.length > 0) {
        await Promise.all(promises)
      } else if (promises.length > 0) {
        // Abort path
        // eslint-disable-next-line no-void
        void Promise.allSettled(promises)
      }
    } catch (error) {
      return { error: toError(error) }
    }

    if (this.fnOpts.afterAll != null) {
      try {
        await this.fnOpts.afterAll.call(this, mode)
      } catch (error) {
        return { error: toError(error) }
      }
    }

    return isValidSamples(samples)
      ? { samples }
      : {}
  }

  private benchmarkSync (
    mode: 'run' | 'warmup',
    time: number,
    iterations: number
  ): { error: Error, samples?: never } | { error?: never, samples?: Samples } {
    if (this.fnOpts.beforeAll != null) {
      try {
        const beforeAllResult = this.fnOpts.beforeAll.call(this, mode)
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
      if (this.isAborted()) {
        return
      }
      try {
        if (this.fnOpts.beforeEach != null) {
          const beforeEachResult = this.fnOpts.beforeEach.call(this, mode)
          invariant(
            !isPromiseLike(beforeEachResult),
            '`beforeEach` function must be sync when using `runSync()`'
          )
        }

        const { taskTime } = this.measureOnceSync()

        samples.push(taskTime)
        totalTime += taskTime
      } finally {
        if (this.fnOpts.afterEach != null) {
          const afterEachResult = this.fnOpts.afterEach.call(this, mode)
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
          !this.isAborted()
      ) {
        benchmarkTask()
      }
    } catch (error) {
      return { error: toError(error) }
    }

    if (this.fnOpts.afterAll != null) {
      try {
        const afterAllResult = this.fnOpts.afterAll.call(this, mode)
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

  /**
   * Check if either our signal or the bench-level signal is aborted
   * @returns `true` if either signal is aborted
   */
  private isAborted (): boolean {
    return this.signal?.aborted === true || this.bench.opts.signal?.aborted === true
  }

  private async measureOnce (): Promise<{ fnResult: ReturnType<Fn>, taskTime: number }> {
    const taskStart = this.bench.opts.now()
    // eslint-disable-next-line no-useless-call
    const fnResult = await this.fn.call(this)
    let taskTime = this.bench.opts.now() - taskStart
    const overriddenDuration = getOverriddenDurationFromFnResult(fnResult)
    if (overriddenDuration !== undefined) {
      taskTime = overriddenDuration
    }
    return { fnResult, taskTime }
  }

  private measureOnceSync (): { fnResult: ReturnType<Fn>, taskTime: number } {
    const taskStart = this.bench.opts.now()
    // eslint-disable-next-line no-useless-call
    const fnResult = this.fn.call(this)
    let taskTime = this.bench.opts.now() - taskStart
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

  private postWarmup (error: Error | undefined): void {
    if (error) {
      this.setTaskResult({
        error,
        state: 'errored',
      })
      this.dispatchEvent(createErrorEvent(this, error))
      this.bench.dispatchEvent(createErrorEvent(this, error))
      if (this.bench.opts.throws) {
        throw error
      }
    }
  }

  private processRunResult ({
    error,
    latencySamples,
  }: {
    error?: Error
    latencySamples?: number[]
  }): void {
    // Always set aborted status, even if no samples were collected
    const isAborted = this.isAborted()

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

      if (isAborted) {
        this.setTaskResult({
          aborted: true,
          period: totalTime / this.runs,
          state: 'aborted-with-statistics',
          totalTime,
          // deprecated statistics included for backward compatibility
          ...latencyStatistics,
          hz: throughputStatistics.mean,
          latency: latencyStatistics,
          throughput: throughputStatistics,
        })
      } else {
        this.setTaskResult({
          aborted: false,
          period: totalTime / this.runs,
          state: 'completed',
          totalTime,
          // deprecated statistics included for backward compatibility
          ...latencyStatistics,
          hz: throughputStatistics.mean,
          latency: latencyStatistics,
          throughput: throughputStatistics,
        })
      }
    } else if (isAborted) {
      // If aborted with no samples, still set the aborted flag
      this.setTaskResult({
        aborted: true,
        state: 'aborted',
      })
    }

    if (error) {
      this.setTaskResult({
        error,
        state: 'errored',
      })
      this.dispatchEvent(createErrorEvent(this, error))
      this.bench.dispatchEvent(createErrorEvent(this, error))
      if (this.bench.opts.throws) {
        throw error
      }
    }

    this.dispatchEvent(createBenchEvent('cycle', this))
    this.bench.dispatchEvent(createBenchEvent('cycle', this))
    // cycle and complete are equal in Task
    this.dispatchEvent(createBenchEvent('complete', this))
  }

  /**
   * set the result object values
   * @param result - the task result object to merge with the current result object values
   */
  private setTaskResult (result: TaskResult): void {
    this.result = Object.freeze({
      runtime: this.bench.runtime,
      runtimeVersion: this.bench.runtimeVersion,
      ...result,
    })
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
