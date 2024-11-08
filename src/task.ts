import pLimit from 'p-limit'

import type Bench from './bench'
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
import { getStatisticsSorted, isFnAsyncResource } from './utils'

/**
 * A class that represents each benchmark task in Tinybench. It keeps track of the
 * results, name, Bench instance, the task function and the number times the task
 * function has been executed.
 */
export default class Task extends EventTarget {
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
   * Task options
   */
  private readonly opts: FnOptions

  /**
   * Task name
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

  constructor (bench: Bench, name: string, fn: Fn, opts: FnOptions = {}) {
    super()
    this.bench = bench
    this.name = name
    this.fn = fn
    this.async = isFnAsyncResource(fn)
    this.opts = opts
    // TODO: support signal in Tasks
  }

  private async benchmark (
    time: number,
    iterations: number
  ): Promise<{ error?: unknown; samples?: number[] }> {
    if (this.opts.beforeAll != null) {
      try {
        await this.opts.beforeAll.call(this)
      } catch (error) {
        return { error }
      }
    }

    // TODO: factor out
    let totalTime = 0 // ms
    const samples: number[] = []
    const benchmarkTask = async () => {
      if (this.opts.beforeEach != null) {
        await this.opts.beforeEach.call(this)
      }

      let taskTime = 0 // ms;
      if (this.async) {
        const taskStart = this.bench.now()
        // eslint-disable-next-line no-useless-call
        await this.fn.call(this)
        taskTime = this.bench.now() - taskStart
      } else {
        const taskStart = this.bench.now()
        // eslint-disable-next-line no-useless-call
        this.fn.call(this)
        taskTime = this.bench.now() - taskStart
      }

      samples.push(taskTime)
      totalTime += taskTime

      if (this.opts.afterEach != null) {
        await this.opts.afterEach.call(this)
      }
    }

    try {
      const limit = pLimit(this.bench.threshold) // only for task level concurrency
      const promises: Promise<void>[] = [] // only for task level concurrency
      while (
        // eslint-disable-next-line no-unmodified-loop-condition
        (totalTime < time ||
          samples.length + limit.activeCount + limit.pendingCount < iterations) &&
        !this.bench.signal?.aborted
      ) {
        if (this.bench.concurrency === 'task') {
          promises.push(limit(benchmarkTask))
        } else {
          await benchmarkTask()
        }
      }
      if (!this.bench.signal?.aborted && promises.length > 0) {
        await Promise.all(promises)
      }
    } catch (error) {
      return { error }
    }

    if (this.opts.afterAll != null) {
      try {
        await this.opts.afterAll.call(this)
      } catch (error) {
        return { error }
      }
    }
    return { samples }
  }

  /**
   * change the result object values
   * @param result - the task result object to merge with the current result object
   */
  private setResult (result: Partial<TaskResult>): void {
    this.result = Object.freeze({
      ...this.result,
      ...result,
    }) as Readonly<TaskResult>
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
    await this.bench.setup(this, 'run')
    const { error, samples: latencySamples } = (await this.benchmark(
      this.bench.time,
      this.bench.iterations
    )) as { error?: Error; samples?: number[] }
    await this.bench.teardown(this, 'run')

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

      if (this.bench.signal?.aborted) {
        return this
      }

      this.setResult({
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
      this.setResult({ error })
      this.dispatchEvent(createErrorEvent(this, error))
      this.bench.dispatchEvent(createErrorEvent(this, error))
      if (this.bench.throws) {
        throw error
      }
    }

    this.dispatchEvent(createBenchEvent('cycle', this))
    this.bench.dispatchEvent(createBenchEvent('cycle', this))
    // cycle and complete are equal in Task
    this.dispatchEvent(createBenchEvent('complete', this))

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
    await this.bench.setup(this, 'warmup')
    const { error } = (await this.benchmark(
      this.bench.warmupTime,
      this.bench.warmupIterations
    )) as { error?: Error }
    await this.bench.teardown(this, 'warmup')

    if (error) {
      this.setResult({ error })
      this.dispatchEvent(createErrorEvent(this, error))
      this.bench.dispatchEvent(createErrorEvent(this, error))
      if (this.bench.throws) {
        throw error
      }
    }
  }
}
