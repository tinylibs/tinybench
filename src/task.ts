import { Bench } from "./bench";
import { tTable } from "./constants";
import { createBenchEvent } from "./event";
import { Fn, TaskResult } from "./types";
import { getMean, getVariance } from "./utils";

export class Task extends EventTarget {
  bench: Bench;
  name: string;
  fn: Fn;
  runs: number = 0;
  result?: TaskResult;

  constructor(bench: Bench, name: string, fn: Fn) {
    super();
    this.bench = bench;
    this.name = name;
    this.fn = fn;
  }

  async run() {
    const startTime = this.bench.now(); // ms
    let totalTime = 0; // ms
    const samples: number[] = [];
    do {
      const taskStart = this.bench.now();

      try {
        await Promise.resolve().then(this.fn);
      } catch (e) {
        this.setResult({ error: e });
      }

      const taskTime = this.bench.now() - taskStart;
      this.runs++;
      samples.push(taskTime);
      totalTime = this.bench.now() - startTime;
    } while (totalTime < this.bench.time && !this.bench.signal?.aborted);

    samples.sort();

    {
      const min = samples[0]!;
      const max = samples[samples.length - 1]!;
      const period = totalTime / this.runs;
      const hz = 1 / period;

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

    {
      if (this.result?.error) {
        this.bench.dispatchEvent(createBenchEvent("error", this));
      }

      this.bench.dispatchEvent(createBenchEvent("cycle", this));
    }

    return this;
  }

  setResult(result: Partial<TaskResult>) {
    this.result = { ...this.result, ...result } as TaskResult;
    Object.freeze(this.reset);
  }

  reset() {
    this.runs = 0;
    this.result = undefined;
  }
}
