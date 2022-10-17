import type {
  Fn, TaskEvents, TaskResult, TaskEventsMap,
} from 'types/index';
import Bench from './bench';
import tTable from './constants';
import { createBenchEvent } from './event';
import { getMean, getVariance } from './utils';

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

  constructor(bench: Bench, name: string, fn: Fn) {
    super();
    this.bench = bench;
    this.name = name;
    this.fn = fn;
    // TODO: support signals in Tasks
  }

  /**
   * run the current task and write the results in `Task.result` object
   */
  async run() {
    this.dispatchEvent(createBenchEvent('start', this));
    let totalTime = 0; // ms
    const samples: number[] = [];
    const isAsync = this.bench.isAsyncFunction(this.fn);

    await this.bench.setup(this, 'run');
    while (
      (totalTime < this.bench.time || this.runs < this.bench.iterations)
      && !this.bench.signal?.aborted
    ) {
      let taskStart = 0;

      try {
        taskStart = this.bench.now();
        if (isAsync) {
          await this.fn();
        } else {
          this.fn();
        }
        const taskTime = this.bench.now() - taskStart;
        this.runs += 1;
        samples.push(taskTime);
        totalTime += taskTime;
      } catch (e) {
        this.setResult({ error: e });
      }
    }
    await this.bench.teardown(this, 'run');

    samples.sort((a,b)=> a - b);

    {
      const min = samples[0]!;
      const max = samples[samples.length - 1]!;
      const period = totalTime / this.runs;
      const hz = 1000 / period;

      // benchmark.js: https://github.com/bestiejs/benchmark.js/blob/42f3b732bac3640eddb3ae5f50e445f3141016fd/benchmark.js#L1912-L1927
      const mean = getMean(samples);
      const variance = getVariance(samples, mean);
      const sd = Math.sqrt(variance);
      const sem = sd / Math.sqrt(samples.length);
      const df = samples.length - 1;
      const critical = tTable[String(Math.round(df) || 1)] || tTable.infinity!;
      const moe = sem * critical;
      const rme = (moe / mean) * 100 || 0;

      // mitata: https://github.com/evanwashere/mitata/blob/3730a784c9d83289b5627ddd961e3248088612aa/src/lib.mjs#L12
      const p75 = samples[Math.ceil(samples.length * (75 / 100)) - 1]!;
      const p99 = samples[Math.ceil(samples.length * (99 / 100)) - 1]!;
      const p995 = samples[Math.ceil(samples.length * (99.5 / 100)) - 1]!;
      const p999 = samples[Math.ceil(samples.length * (99.9 / 100)) - 1]!;

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

    this.bench.setup(this, 'warmup');
    while (
      (totalTime < this.bench.warmupTime
        || this.runs < this.bench.warmupIterations)
      && !this.bench.signal?.aborted
    ) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve().then(this.fn);
      } catch {
        // todo
      }

      this.runs += 1;
      totalTime = this.bench.now() - startTime;
    }
    this.bench.teardown(this, 'warmup');

    this.runs = 0;
  }

  addEventListener<K extends TaskEvents, T = TaskEventsMap[K]>(
    type: K,
    listener: T,
    options?: boolean | AddEventListenerOptions,
  ) {
    super.addEventListener(type, listener as any, options);
  }

  removeEventListener<K extends TaskEvents, T = TaskEventsMap[K]>(
    type: K,
    listener: T,
    options?: boolean | EventListenerOptions,
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
