import type {
  Fn,
  TaskEvents,
  TaskResult,
  TaskEventsMap,
  FnOptions,
} from '../types/index';
import Bench from './bench';
import tTable from './constants';
import { createBenchEvent } from './event';
import { AddEventListenerOptionsArgument, RemoveEventListenerOptionsArgument } from './types';
import { getMean, getVariance, isAsyncTask } from './utils';

/**
 * A class that represents each benchmark task in Tinybench. It keeps track of the
 * results, name, Bench instance, the task function and the number times the task
 * function has been executed.
 */
export default class Task extends EventTarget {
  bench: Bench;

  /**
   * task name
   */
  name: string;

  fn: Fn;

  /*
   * the number of times the task
   * function has been executed
   */
  runs = 0;

  /**
   * the result object
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

  /**
   * run the current task and write the results in `Task.result` object
   */
  async run() {
    this.dispatchEvent(createBenchEvent('start', this));
    let totalTime = 0; // ms
    let min = Infinity;
    let max = -Infinity;
    const samples: number[] = [];

    await this.bench.setup(this, 'run');

    if (this.opts.beforeAll != null) {
      try {
        await this.opts.beforeAll.call(this);
      } catch (e) {
        this.setResult({ error: e });
      }
    }
    const isAsync = await isAsyncTask(this);

    try {
      while (
        (totalTime < this.bench.time || this.runs < this.bench.iterations)
        && !this.bench.signal?.aborted
      ) {
        if (this.opts.beforeEach != null) {
          await this.opts.beforeEach.call(this);
        }

        let taskTime = 0;
        if (isAsync) {
          const taskStart = this.bench.now();
          await this.fn();
          taskTime = this.bench.now() - taskStart;
        } else {
          const taskStart = this.bench.now();
          this.fn();
          taskTime = this.bench.now() - taskStart;
        }

        this.runs += 1;
        totalTime += taskTime;
        samples.push(taskTime);
        if (taskTime > max) max = taskTime;
        if (taskTime < min) min = taskTime;

        if (this.opts.afterEach != null) {
          await this.opts.afterEach.call(this);
        }
      }
    } catch (e) {
      this.setResult({ error: e });
    }

    if (this.opts.afterAll != null) {
      try {
        await this.opts.afterAll.call(this);
      } catch (e) {
        this.setResult({ error: e });
      }
    }

    await this.bench.teardown(this, 'run');

    if (!this.result?.error) {
      const period = totalTime / this.runs;
      const hz = 1000 / period;

      // benchmark.js: https://github.com/bestiejs/benchmark.js/blob/42f3b732bac3640eddb3ae5f50e445f3141016fd/benchmark.js#L1912-L1927
      const simplesLength = samples.length;
      const mean = getMean(samples);
      const variance = getVariance(samples, mean);
      const sd = Math.sqrt(variance);
      const sem = sd / Math.sqrt(simplesLength);
      const df = simplesLength - 1;
      const critical = tTable[String(Math.round(df) || 1)] || tTable.infinity!;
      const moe = sem * critical;
      const rme = (moe / mean) * 100 || 0;

      // mitata: https://github.com/evanwashere/mitata/blob/3730a784c9d83289b5627ddd961e3248088612aa/src/lib.mjs#L12
      const p75 = samples[Math.ceil(simplesLength * (75 / 100)) - 1]!;
      const p99 = samples[Math.ceil(simplesLength * (99 / 100)) - 1]!;
      const p995 = samples[Math.ceil(simplesLength * (99.5 / 100)) - 1]!;
      const p999 = samples[Math.ceil(simplesLength * (99.9 / 100)) - 1]!;

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
        p75,
        p99,
        p995,
        p999,
      });
    }

    // eslint-disable-next-line no-lone-blocks
    {
      if (this.result?.error) {
        this.dispatchEvent(createBenchEvent('error', this));
        this.bench.dispatchEvent(createBenchEvent('error', this));
      }

      this.dispatchEvent(createBenchEvent('cycle', this));
      this.bench.dispatchEvent(createBenchEvent('cycle', this));
      // cycle and complete are equal in Task
      this.dispatchEvent(createBenchEvent('complete', this));
    }

    return this;
  }

  /**
   * warmup the current task
   */
  async warmup() {
    this.dispatchEvent(createBenchEvent('warmup', this));
    const startTime = this.bench.now();
    let totalTime = 0;

    await this.bench.setup(this, 'warmup');

    if (this.opts.beforeAll != null) {
      try {
        await this.opts.beforeAll.call(this);
      } catch (e) {
        this.setResult({ error: e });
      }
    }
    const isAsync = await isAsyncTask(this);

    while (
      (totalTime < this.bench.warmupTime
        || this.runs < this.bench.warmupIterations)
      && !this.bench.signal?.aborted
    ) {
      if (this.opts.beforeEach != null) {
        try {
          await this.opts.beforeEach.call(this);
        } catch (e) {
          this.setResult({ error: e });
        }
      }

      try {
        // eslint-disable-next-line no-await-in-loop
        if (isAsync) {
          await this.fn();
        } else {
          this.fn();
        }
      } catch {
        // todo
      }

      this.runs += 1;
      totalTime = this.bench.now() - startTime;

      if (this.opts.afterEach != null) {
        try {
          await this.opts.afterEach.call(this);
        } catch (e) {
          this.setResult({ error: e });
        }
      }
    }

    if (this.opts.afterAll != null) {
      try {
        await this.opts.afterAll.call(this);
      } catch (e) {
        this.setResult({ error: e });
      }
    }
    this.bench.teardown(this, 'warmup');

    this.runs = 0;
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
    Object.freeze(this.reset);
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
