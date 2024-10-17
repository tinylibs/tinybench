import pLimit from 'p-limit';
import type Bench from './bench';
import tTable from './constants';
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
import {
  absoluteDeviation,
  getVariance,
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
    // TODO: support signal in Tasks
  }

  private async loop(
    time: number,
    iterations: number,
  ): Promise<{ error?: unknown; samples?: number[] }> {
    let totalTime = 0; // ms
    const samples: number[] = [];
    if (this.opts.beforeAll != null) {
      try {
        await this.opts.beforeAll.call(this);
      } catch (error) {
        return { error };
      }
    }

    const asyncTask = await isAsyncTask(this);

    // TODO: factor out
    const executeTask = async () => {
      if (this.opts.beforeEach != null) {
        await this.opts.beforeEach.call(this);
      }

      let taskTime = 0;
      if (asyncTask) {
        const taskStart = this.bench.now();
        await this.fn();
        taskTime = this.bench.now() - taskStart;
      } else {
        const taskStart = this.bench.now();
        this.fn();
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
          promises.push(limit(executeTask));
        } else {
          await executeTask();
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
    const { samples, error } = await this.loop(
      this.bench.time,
      this.bench.iterations,
    );
    this.bench.teardown(this, 'run');

    if (samples) {
      const totalTime = samples.reduce((a, b) => a + b, 0);
      this.runs = samples.length;

      samples.sort((a, b) => a - b);
      const period = totalTime / this.runs;
      const hz = 1000 / period;
      const samplesLength = samples.length;
      const df = samplesLength - 1;
      const min = samples[0]!;
      const max = samples[df]!;
      // benchmark.js: https://github.com/bestiejs/benchmark.js/blob/42f3b732bac3640eddb3ae5f50e445f3141016fd/benchmark.js#L1912-L1927
      const mean = totalTime / samples.length || 0;
      const variance = getVariance(samples, mean);
      const sd = Math.sqrt(variance);
      const sem = sd / Math.sqrt(samplesLength);
      const critical = tTable[String(Math.round(df) || 1)] || tTable.infinity!;
      const moe = sem * critical;
      const rme = (moe / mean) * 100;

      const mad = absoluteDeviation(samples, medianSorted);

      const p50 = medianSorted(samples);
      const p75 = quantileSorted(samples, 0.75);
      const p99 = quantileSorted(samples, 0.99);
      const p995 = quantileSorted(samples, 0.995);
      const p999 = quantileSorted(samples, 0.999);

      if (this.bench.signal?.aborted) {
        return this;
      }

      this.setResult({
        totalTime,
        min,
        max,
        hz,
        period,
        samples,
        mean,
        variance,
        sd,
        sem,
        df,
        critical,
        moe,
        rme,
        mad,
        p50,
        p75,
        p99,
        p995,
        p999,
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
    const { error } = await this.loop(
      this.bench.warmupTime,
      this.bench.warmupIterations,
    );
    this.bench.teardown(this, 'warmup');

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
   * reset the task to make the `Task.runs` a zero-value and remove the `Task.result`
   * object
   */
  reset() {
    this.dispatchEvent(createBenchEvent('reset', this));
    this.runs = 0;
    this.result = undefined;
  }
}
