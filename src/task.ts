import pLimit from 'p-limit';
import type {
  Fn,
  TaskEvents,
  TaskResult,
  TaskEventsMap,
  FnOptions,
} from './types';
import Bench from './bench';
import { tTable } from './constants';
import { createBenchEvent } from './event';
import { AddEventListenerOptionsArgument, RemoveEventListenerOptionsArgument } from './types';
import {
  absoluteDeviation,
  average,
  variance,
  isAsyncTask,
  medianSorted,
  quantileSorted,
} from './utils';

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
    this.opts = opts;
    // TODO: support signals in Tasks
  }

  private async loop(time: number, iterations: number): Promise<{ error?: unknown, samples?: number[] }> {
    const concurrent = this.bench.concurrency === 'task';
    const { threshold } = this.bench;
    let totalTime = 0; // ms
    const samples: number[] = [];
    if (this.opts.beforeAll != null) {
      try {
        await this.opts.beforeAll.call(this);
      } catch (error) {
        return { error };
      }
    }
    const isAsync = await isAsyncTask(this);

    const executeTask = async () => {
      if (this.opts.beforeEach != null) {
        await this.opts.beforeEach.call(this);
      }

      let taskTime = 0;
      if (isAsync) {
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

    const limit = pLimit(threshold);
    try {
      const promises: Promise<void>[] = []; // only for task level concurrency
      while (
        (totalTime < time || ((samples.length + limit.activeCount + limit.pendingCount) < iterations))
        && !this.bench.signal?.aborted
      ) {
        if (concurrent) {
          promises.push(limit(executeTask));
        } else {
          await executeTask();
        }
      }
      if (promises.length) {
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
   * run the current task and write the results in `Task.result` object
   */
  async run() {
    if (this.result?.error) {
      return this;
    }
    this.dispatchEvent(createBenchEvent('start', this));
    await this.bench.setup(this, 'run');
    const { samples: latencySamples, error } = await this.loop(this.bench.time, this.bench.iterations);
    this.bench.teardown(this, 'run');

    if (latencySamples) {
      this.runs = latencySamples.length;
      // Latency statistics
      const totalTime = latencySamples.reduce((a, b) => a + b, 0);

      latencySamples.sort((a, b) => a - b);
      const latencyDf = this.runs - 1;
      const latencyMin = latencySamples[0]!;
      const latencyMax = latencySamples[latencyDf]!;
      // benchmark.js: https://github.com/bestiejs/benchmark.js/blob/42f3b732bac3640eddb3ae5f50e445f3141016fd/benchmark.js#L1912-L1927
      const latencyMean = average(latencySamples);
      const latencyVariance = variance(latencySamples, latencyMean);
      const latencySd = Math.sqrt(latencyVariance);
      const latencySem = latencySd / Math.sqrt(this.runs);
      const latencyCritical = tTable[String(Math.round(latencyDf) || 1)] || tTable.infinity!;
      const latencyMoe = latencySem * latencyCritical;
      const latencyRme = (latencyMoe / latencyMean) * 100;

      const latencyAad = absoluteDeviation(latencySamples, average);
      const latencyMad = absoluteDeviation(latencySamples, medianSorted);

      const latencyP50 = medianSorted(latencySamples);
      const latencyP75 = quantileSorted(latencySamples, 0.75);
      const latencyP99 = quantileSorted(latencySamples, 0.99);
      const latencyP995 = quantileSorted(latencySamples, 0.995);
      const latencyP999 = quantileSorted(latencySamples, 0.999);

      // Throughput statistics
      const throughputSamples = latencySamples
        .map((sample) => (sample !== 0 ? 1000 / sample : 1000 / latencyMean)) // Use latency average as imputed sample
        .sort((a, b) => a - b);
      const throughputDf = this.runs - 1;
      const throughputMin = throughputSamples[0]!;
      const throughputMax = throughputSamples[throughputDf]!;
      const throughputMean = average(throughputSamples);
      const throughputVariance = variance(throughputSamples, throughputMean);
      const throughputSd = Math.sqrt(throughputVariance);
      const throughputSem = throughputSd / Math.sqrt(this.runs);
      const throughputCritical = tTable[String(Math.round(throughputDf) || 1)] || tTable.infinity!;
      const throughputMoe = throughputSem * throughputCritical;
      const throughputRme = (throughputMoe / throughputMean) * 100;

      const throughputAad = absoluteDeviation(throughputSamples, average);
      const throughputMad = absoluteDeviation(throughputSamples, medianSorted);

      const throughputP50 = medianSorted(throughputSamples);
      const throughputP75 = quantileSorted(throughputSamples, 0.75);
      const throughputP99 = quantileSorted(throughputSamples, 0.99);
      const throughputP995 = quantileSorted(throughputSamples, 0.995);
      const throughputP999 = quantileSorted(throughputSamples, 0.999);

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
    const { error } = await this.loop(this.bench.warmupTime, this.bench.warmupIterations);
    this.bench.teardown(this, 'warmup');

    if (error) {
      this.setResult({ error });
      if (this.bench.throws) {
        throw error;
      }
    }
  }

  addEventListener<K extends TaskEvents, T = TaskEventsMap[K]>(
    type: K,
    listener: T,
    options?: AddEventListenerOptionsArgument,
  ) {
    super.addEventListener(type, listener as any, options);
  }

  removeEventListener<K extends TaskEvents, T = TaskEventsMap[K]>(
    type: K,
    listener: T,
    options?: RemoveEventListenerOptionsArgument,
  ) {
    super.removeEventListener(type, listener as any, options);
  }

  /**
   * change the result object values
   */
  setResult(result: Partial<TaskResult>) {
    this.result = { ...this.result, ...result } as TaskResult;
    Object.freeze(this.result);
  }

  /**
   * reset the task to make the `Task.runs` a zero-value and remove the `Task.result`
   * object
   */
  reset() {
    this.dispatchEvent(createBenchEvent('reset', this));
    this.runs = 0;
    this.result = undefined;
  }
}
