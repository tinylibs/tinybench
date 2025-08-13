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
  invariant,
  isFnAsyncResource,
  isPromiseLike,
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
   * The task synchronous status
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

  constructor (bench: Bench, name: string, fn: Fn, fnOpts: FnOptions = {}) {
    super()
    this.bench = bench
    this.name = name
    this.fn = fn
    this.fnOpts = fnOpts
    this.async = isFnAsyncResource(fn)
    // TODO: support signal in Tasks
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

    // TODO: factor out
    let totalTime = 0 // ms
    const samples: number[] = []
    const benchmarkTask = async () => {
      if (this.fnOpts.beforeEach != null) {
        await this.fnOpts.beforeEach.call(this, mode)
      }

      let taskTime = 0 // ms;
      if (this.async) {
        const taskStart = this.bench.opts.now()
        // eslint-disable-next-line no-useless-call
        const fnResult = await this.fn.call(this)
        taskTime = this.bench.opts.now() - taskStart

        const overriddenDuration = getOverriddenDurationFromFnResult(fnResult)
        if (overriddenDuration != null) {
          taskTime = overriddenDuration
        }
      } else {
        const taskStart = this.bench.opts.now()
        // eslint-disable-next-line no-useless-call
        const fnResult = this.fn.call(this)
        taskTime = this.bench.opts.now() - taskStart

        const overriddenDuration = getOverriddenDurationFromFnResult(fnResult)
        if (overriddenDuration != null) {
          taskTime = overriddenDuration
        }
      }

      samples.push(taskTime)
      totalTime += taskTime

      if (this.fnOpts.afterEach != null) {
        await this.fnOpts.afterEach.call(this, mode)
      }
    }

    try {
      const limit = pLimit(this.bench.threshold) // only for task level concurrency
      const promises: Promise<void>[] = [] // only for task level concurrency
      while (
        // eslint-disable-next-line no-unmodified-loop-condition
        (totalTime < time ||
          samples.length + limit.activeCount + limit.pendingCount < iterations) &&
        !this.bench.opts.signal?.aborted
      ) {
        if (this.bench.concurrency === 'task') {
          promises.push(limit(benchmarkTask))
        } else {
          await benchmarkTask()
        }
      }
      if (!this.bench.opts.signal?.aborted && promises.length > 0) {
        await Promise.all(promises)
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

    // TODO: factor out
    let totalTime = 0 // ms
    const samples: number[] = []
    const benchmarkTask = () => {
      if (this.fnOpts.beforeEach != null) {
        const beforeEachResult = this.fnOpts.beforeEach.call(this, mode)
        invariant(
          !isPromiseLike(beforeEachResult),
          '`beforeEach` function must be sync when using `runSync()`'
        )
      }

      let taskTime = 0 // ms;

      const taskStart = this.bench.opts.now()
      // eslint-disable-next-line no-useless-call
      const fnResult = this.fn.call(this)
      taskTime = this.bench.opts.now() - taskStart

      invariant(
        !isPromiseLike(fnResult),
        'task function must be sync when using `runSync()`'
      )

      const overriddenDuration = getOverriddenDurationFromFnResult(fnResult)
      if (overriddenDuration != null) {
        taskTime = overriddenDuration
      }

      samples.push(taskTime)
      totalTime += taskTime

      if (this.fnOpts.afterEach != null) {
        const afterEachResult = this.fnOpts.afterEach.call(this, mode)
        invariant(
          !isPromiseLike(afterEachResult),
          '`afterEach` function must be sync when using `runSync()`'
        )
      }
    }

    try {
      while (
        // eslint-disable-next-line no-unmodified-loop-condition
        totalTime < time ||
        samples.length < iterations
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
    if (latencySamples) {
      this.runs = latencySamples.length
      const totalTime = latencySamples.reduce((a, b) => a + b, 0)

      // Latency statistics
      const latencyStatistics = getStatisticsSorted(
        latencySamples.sort((a, b) => a - b)
      )

      // Throughput statistics
      const throughputSamples = latencySamples
        .map(sample =>
          sample !== 0 ? 1000 / sample : 1000 / latencyStatistics.mean
        ) // Use latency average as imputed sample
        .sort((a, b) => a - b)
      const throughputStatistics = getStatisticsSorted(throughputSamples)

      if (this.bench.opts.signal?.aborted) {
        return
      }

      this.mergeTaskResult({
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
    typeof fnResult.overriddenDuration === 'number'
  ) {
    return fnResult.overriddenDuration
  }
}
