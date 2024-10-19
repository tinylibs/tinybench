import pLimit from 'p-limit';
import type Bench from './bench';
import { createBenchEvent } from './event';
import type {
  AddEventListenerOptionsArgument,
  EventListener,
  Fn,
  FnOptions,
  RemoveEventListenerOptionsArgument,
  TaskEvents,
  TaskEventsMap,
  TaskResult,
} from './types';
import { getStatistics, isFnAsyncResource } from './utils';

/**
 * A class that represents each benchmark task in Tinybench. It keeps track of the
 * results, name, Bench instance, the task function and the number times the task
 * function has been executed.
 */
export default class Task extends EventTarget {
  bench: Bench;

  /**
   * Task name
   */
  name: string;

  /**
   * The task function
   */
  fn: Fn;

  /**
   * The task synchronous status
   */
  async: boolean;

  /*
   * The number of times the task function has been executed
   */
  runs = 0;

  /**
   * The result object
   */
  result?: TaskResult;

  /**
   * Task options
   */
  opts: FnOptions;

  constructor(bench: Bench, name: string, fn: Fn, opts: FnOptions = {}) {
    super();
    this.bench = bench;
    this.name = name;
    this.fn = fn;
    this.async = isFnAsyncResource(fn);
    this.opts = opts;
    // TODO: support signal in Tasks
  }

  private async benchmark(
    time: number,
    iterations: number,
  ): Promise<{ samples?: number[]; error?: unknown }> {
    if (this.opts.beforeAll != null) {
      try {
        await this.opts.beforeAll.call(this);
      } catch (error) {
        return { error };
      }
    }

    // TODO: factor out
    let totalTime = 0; // ms
    const samples: number[] = [];
    const benchmarkTask = async () => {
      if (this.opts.beforeEach != null) {
        await this.opts.beforeEach.call(this);
      }

      let taskTime = 0; // ms;
      if (this.async) {
        const taskStart = this.bench.now();
        await this.fn.call(this);
        taskTime = this.bench.now() - taskStart;
      } else {
        const taskStart = this.bench.now();
        this.fn.call(this);
        taskTime = this.bench.now() - taskStart;
      }

      samples.push(taskTime);
      totalTime += taskTime;

      if (this.opts.afterEach != null) {
        await this.opts.afterEach.call(this);
      }
    };

    try {
      const limit = pLimit(this.bench.threshold); // only for task level concurrency
      const promises: Promise<void>[] = []; // only for task level concurrency
      while (
        (totalTime < time
          || samples.length + limit.activeCount + limit.pendingCount < iterations)
        && !this.bench.signal?.aborted
      ) {
        if (this.bench.concurrency === 'task') {
          promises.push(limit(benchmarkTask));
        } else {
          await benchmarkTask();
        }
      }
      if (promises.length > 0) {
        await Promise.all(promises);
      }
    } catch (error) {
      return { error };
    }

    if (this.opts.afterAll != null) {
      try {
        await this.opts.afterAll.call(this);
      } catch (error) {
        return { error };
      }
    }
    return { samples };
  }

  /**
   * run the current task and write the results in `Task.result` object property
   */
  async run() {
    if (this.result?.error) {
      return this;
    }
    this.dispatchEvent(createBenchEvent('start', this));
    await this.bench.setup(this, 'run');
    const { samples: latencySamples, error } = (await this.benchmark(
      this.bench.time,
      this.bench.iterations,
    )) as { samples?: number[]; error?: Error };
    await this.bench.teardown(this, 'run');

    if (latencySamples) {
      this.runs = latencySamples.length;
      const totalTime = latencySamples.reduce((a, b) => a + b, 0);

      // Latency statistics
      const {
        min: latencyMin,
        max: latencyMax,
        mean: latencyMean,
        variance: latencyVariance,
        sd: latencySd,
        sem: latencySem,
        df: latencyDf,
        critical: latencyCritical,
        moe: latencyMoe,
        rme: latencyRme,
        aad: latencyAad,
        mad: latencyMad,
        p50: latencyP50,
        p75: latencyP75,
        p99: latencyP99,
        p995: latencyP995,
        p999: latencyP999,
      } = getStatistics(latencySamples.sort((a, b) => a - b));

      // Throughput statistics
      const throughputSamples = latencySamples
        .map((sample) => (sample !== 0 ? 1000 / sample : 1000 / latencyMean)) // Use latency average as imputed sample
        .sort((a, b) => a - b);
      const {
        min: throughputMin,
        max: throughputMax,
        mean: throughputMean,
        variance: throughputVariance,
        sd: throughputSd,
        sem: throughputSem,
        df: throughputDf,
        critical: throughputCritical,
        moe: throughputMoe,
        rme: throughputRme,
        aad: throughputAad,
        mad: throughputMad,
        p50: throughputP50,
        p75: throughputP75,
        p99: throughputP99,
        p995: throughputP995,
        p999: throughputP999,
      } = getStatistics(throughputSamples);

      if (this.bench.signal?.aborted) {
        return this;
      }

      this.setResult({
        totalTime,
        period: totalTime / this.runs,
        latency: {
          samples: latencySamples,
          min: latencyMin,
          max: latencyMax,
          mean: latencyMean,
          variance: latencyVariance,
          sd: latencySd,
          sem: latencySem,
          df: latencyDf,
          critical: latencyCritical,
          moe: latencyMoe,
          rme: latencyRme,
          aad: latencyAad,
          mad: latencyMad,
          p50: latencyP50,
          p75: latencyP75,
          p99: latencyP99,
          p995: latencyP995,
          p999: latencyP999,
        },
        throughput: {
          samples: throughputSamples,
          min: throughputMin,
          max: throughputMax,
          mean: throughputMean,
          variance: throughputVariance,
          sd: throughputSd,
          sem: throughputSem,
          df: throughputDf,
          critical: throughputCritical,
          moe: throughputMoe,
          rme: throughputRme,
          aad: throughputAad,
          mad: throughputMad,
          p50: throughputP50,
          p75: throughputP75,
          p99: throughputP99,
          p995: throughputP995,
          p999: throughputP999,
        },
        hz: throughputMean,
        samples: latencySamples,
        min: latencyMin,
        max: latencyMax,
        mean: latencyMean,
        variance: latencyVariance,
        sd: latencySd,
        sem: latencySem,
        df: latencyDf,
        critical: latencyCritical,
        moe: latencyMoe,
        rme: latencyRme,
        p75: latencyP75,
        p99: latencyP99,
        p995: latencyP995,
        p999: latencyP999,
      });
    }

    if (error) {
      this.setResult({ error });
      if (this.bench.throws) {
        throw error;
      }
      this.dispatchEvent(createBenchEvent('error', this));
      this.bench.dispatchEvent(createBenchEvent('error', this));
    }

    this.dispatchEvent(createBenchEvent('cycle', this));
    this.bench.dispatchEvent(createBenchEvent('cycle', this));
    // cycle and complete are equal in Task
    this.dispatchEvent(createBenchEvent('complete', this));

    return this;
  }

  /**
   * warmup the current task
   */
  async warmup() {
    if (this.result?.error) {
      return;
    }
    this.dispatchEvent(createBenchEvent('warmup', this));
    await this.bench.setup(this, 'warmup');
    const { error } = (await this.benchmark(
      this.bench.warmupTime,
      this.bench.warmupIterations,
    )) as { error?: Error };
    await this.bench.teardown(this, 'warmup');

    if (error) {
      this.setResult({ error });
      if (this.bench.throws) {
        throw error;
      }
    }
  }

  addEventListener<
    K extends TaskEvents,
    T extends EventListener = TaskEventsMap[K],
  >(type: K, listener: T, options?: AddEventListenerOptionsArgument) {
    super.addEventListener(type, listener, options);
  }

  removeEventListener<
    K extends TaskEvents,
    T extends EventListener = TaskEventsMap[K],
  >(type: K, listener: T, options?: RemoveEventListenerOptionsArgument) {
    super.removeEventListener(type, listener, options);
  }

  /**
   * change the result object values
   */
  setResult(result: Partial<TaskResult>) {
    this.result = { ...this.result, ...result } as TaskResult;
    Object.freeze(this.result);
  }

  /**
   * reset the task to make the `Task.runs` a zero-value and remove the `Task.result` object property
   */
  reset() {
    this.dispatchEvent(createBenchEvent('reset', this));
    this.runs = 0;
    this.result = undefined;
  }
}
