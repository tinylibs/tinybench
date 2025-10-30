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
} from './types'

import { createBenchEvent, createErrorEvent } from './event'
import {
  getStatisticsSorted,
  sortFn,
  invariant,
  isFnAsyncResource,
  isPromiseLike,
  isSamples,
  Samples,
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
  result: Readonly<TaskResult> | undefined

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
  }

  addEventListener<K extends TaskEvents>(
    type: K,
    listener: TaskEventsMap[K],
    options?: AddEventListenerOptionsArgument
  ): void {
    super.addEventListener(type, listener, options)
  }

  removeEventListener<K extends TaskEvents>(
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
    this.result = undefined
  }

  /**
   * run the current task and write the results in `Task.result` object property
   * @returns the current task
   * @internal
   */
  async run (): Promise<Task> {
    if (this.result?.error) {
      return this
    }
    this.dispatchEvent(createBenchEvent('start', this))
    await this.bench.opts.setup(this, 'run')
    const { error, samples: latencySamples } = (await this.benchmark(
      'run',
      this.bench.opts.time,
      this.bench.opts.iterations
    )) as { error?: Error; samples?: number[] }
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
    if (this.result?.error) {
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
    ) as { error?: Error; samples?: number[] }

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
    if (this.result?.error) {
      return
    }
    this.dispatchEvent(createBenchEvent('warmup', this))
    await this.bench.opts.setup(this, 'warmup')
    const { error } = (await this.benchmark(
      'warmup',
      this.bench.opts.warmupTime,
      this.bench.opts.warmupIterations
    )) as { error?: Error }
    await this.bench.opts.teardown(this, 'warmup')

    this.postWarmup(error)
  }

  /**
   * warmup the current task (sync version)
   * @internal
   */
  warmupSync (): void {
    if (this.result?.error) {
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
    ) as { error?: Error }

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
  ): Promise<{ error?: unknown; samples?: number[] }> {
    if (this.fnOpts.beforeAll != null) {
      try {
        await this.fnOpts.beforeAll.call(this, mode)
      } catch (error) {
        return { error }
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
      let limit: ReturnType<typeof pLimit> | undefined // only for task level concurrency
      if (this.bench.concurrency === 'task') {
        limit = pLimit(Math.max(1, Math.floor(this.bench.threshold)))
      }
      const promises: Promise<void>[] = [] // only for task level concurrency
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
      return { error }
    }

    if (this.fnOpts.afterAll != null) {
      try {
        await this.fnOpts.afterAll.call(this, mode)
      } catch (error) {
        return { error }
      }
    }
    return { samples }
  }

  private benchmarkSync (
    mode: 'run' | 'warmup',
    time: number,
    iterations: number
  ): { error?: unknown; samples?: number[] } {
    if (this.fnOpts.beforeAll != null) {
      try {
        const beforeAllResult = this.fnOpts.beforeAll.call(this, mode)
        invariant(
          !isPromiseLike(beforeAllResult),
          '`beforeAll` function must be sync when using `runSync()`'
        )
      } catch (error) {
        return { error }
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
      return { error }
    }

    if (this.fnOpts.afterAll != null) {
      try {
        const afterAllResult = this.fnOpts.afterAll.call(this, mode)
        invariant(
          !isPromiseLike(afterAllResult),
          '`afterAll` function must be sync when using `runSync()`'
        )
      } catch (error) {
        return { error }
      }
    }
    return { samples }
  }

  /**
   * Check if either our signal or the bench-level signal is aborted
   * @returns `true` if either signal is aborted
   */
  private isAborted (): boolean {
    return this.signal?.aborted === true || this.bench.opts.signal?.aborted === true
  }

  private async measureOnce (): Promise<{ fnResult: ReturnType<Fn>; taskTime: number }> {
    const taskStart = this.bench.opts.now()
    // eslint-disable-next-line no-useless-call
    const fnResult = await this.fn.call(this)
    let taskTime = this.bench.opts.now() - taskStart
    const overriddenDuration = getOverriddenDurationFromFnResult(fnResult)
    if (overriddenDuration != null) {
      taskTime = overriddenDuration
    }
    return { fnResult, taskTime }
  }

  private measureOnceSync (): { fnResult: ReturnType<Fn>; taskTime: number } {
    const taskStart = this.bench.opts.now()
    // eslint-disable-next-line no-useless-call
    const fnResult = this.fn.call(this)
    let taskTime = this.bench.opts.now() - taskStart
    invariant(
      !isPromiseLike(fnResult),
      'task function must be sync when using `runSync()`'
    )
    const overriddenDuration = getOverriddenDurationFromFnResult(fnResult)
    if (overriddenDuration != null) {
      taskTime = overriddenDuration
    }
    return { fnResult, taskTime }
  }

  /**
   * merge into the result object values
   * @param result - the task result object to merge with the current result object values
   */
  private mergeTaskResult (result: Partial<TaskResult>): void {
    this.result = Object.freeze({
      ...this.result,
      ...result,
    }) as Readonly<TaskResult>
  }

  private postWarmup (error: Error | undefined): void {
    if (error) {
      this.mergeTaskResult({ error })
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

    if (isSamples(latencySamples)) {
      this.runs = latencySamples.length
      const totalTime = latencySamples.reduce((a, b) => a + b, 0)

      // Latency statistics
      const latencyStatistics = getStatisticsSorted(
        latencySamples.sort(sortFn) as Samples
      )

      // Throughput statistics
      const throughputSamples = latencySamples
        .map(sample =>
          sample !== 0
            ? 1000 / sample
            : latencyStatistics.mean !== 0
              ? 1000 / latencyStatistics.mean
              : 0
        ) // Use latency average as imputed sample
        .sort(sortFn) as Samples
      const throughputStatistics = getStatisticsSorted(throughputSamples)

      this.mergeTaskResult({
        aborted: isAborted,
        critical: latencyStatistics.critical,
        df: latencyStatistics.df,
        hz: throughputStatistics.mean,
        latency: latencyStatistics,
        max: latencyStatistics.max,
        mean: latencyStatistics.mean,
        min: latencyStatistics.min,
        moe: latencyStatistics.moe,
        p75: latencyStatistics.p75,
        p99: latencyStatistics.p99,
        p995: latencyStatistics.p995,
        p999: latencyStatistics.p999,
        period: totalTime / this.runs,
        rme: latencyStatistics.rme,
        runtime: this.bench.runtime,
        runtimeVersion: this.bench.runtimeVersion,
        samples: latencyStatistics.samples,
        sd: latencyStatistics.sd,
        sem: latencyStatistics.sem,
        throughput: throughputStatistics,
        totalTime,
        variance: latencyStatistics.variance,
      })
    } else if (isAborted) {
      // If aborted with no samples, still set the aborted flag
      this.mergeTaskResult({ aborted: true })
    }

    if (error) {
      this.mergeTaskResult({ error })
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
}

/**
 *
 * @param fnResult - the result of the task function.
 * @returns the overridden duration if defined by the function.
 */
function getOverriddenDurationFromFnResult (
  fnResult: ReturnType<Fn>
): number | undefined {
  if (
    fnResult != null &&
    typeof fnResult === 'object' &&
    'overriddenDuration' in fnResult &&
    typeof fnResult.overriddenDuration === 'number' &&
    Number.isFinite(fnResult.overriddenDuration) &&
    fnResult.overriddenDuration >= 0
  ) {
    return fnResult.overriddenDuration
  }
}
