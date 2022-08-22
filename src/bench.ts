import { tTable } from "./constants";
import { createBenchEvent } from "./event";
import { Task } from "./task";
import type { Events, Fn, Options } from "./types";
import { now, getMean, getVariance } from "./utils";

export class Bench extends EventTarget {
  #tasks: Map<string, Task> = new Map();
  signal?: AbortSignal;
  time = 500;
  now = now;

  constructor(options: Options = {}) {
    super();
    this.now = options.now || now;
    this.time = options.time || this.time;
    this.signal = options.signal;

    if (this.signal) {
      this.signal.addEventListener(
        "abort",
        () => {
          this.dispatchEvent(new Event("abort"));
        },
        { once: true }
      );
    }
  }

  private async runTask(task: Task) {
    if (this.signal?.aborted) {
      return task;
    }
    const startTime = this.now(); // ms
    let totalTime = 0; // ms
    const samples: number[] = [];
    do {
      const taskStart = this.now();
      try {
        await Promise.resolve().then(task.fn);
      } catch (e) {
        task.setResult({ error: e });
      }

      const taskTime = this.now() - taskStart;
      task.runs++;
      samples.push(taskTime);
      totalTime = this.now() - startTime;
    } while (totalTime < this.time && !this.signal?.aborted);

    samples.sort();

    {
      const min = samples[0]!;
      const max = samples[samples.length - 1]!;
      const period = totalTime / task.runs;
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

      if (this.signal?.aborted) {
        return task;
      }

      task.setResult({
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
      if (task.result?.error) {
        this.dispatchEvent(createBenchEvent("error", task));
      }

      this.dispatchEvent(createBenchEvent("cycle", task));
    }

    return task;
  }

  async run() {
    this.dispatchEvent(new Event("start"));
    const values = await Promise.all(
      [...this.#tasks.entries()].map(([_, task]) => {
        return this.runTask(task);
      })
    );
    this.dispatchEvent(createBenchEvent("complete"));
    return values;
  }

  reset() {
    this.dispatchEvent(createBenchEvent("reset"));
    this.#tasks.forEach((task) => {
      task.reset();
    });
  }

  add(name: string, fn: Fn) {
    const task = new Task(name, fn);
    this.#tasks.set(name, task);
    return this;
  }

  remove(name: string) {
    this.#tasks.delete(name);
    return this;
  }

  addEventListener(
    type: Events,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    super.addEventListener(type, listener, options);
  }

  removeEventListener(
    type: Events,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ) {
    super.removeEventListener(type, listener as any, options);
  }

  get results() {
    return [...this.#tasks.values()].map((task) =>
      Object.freeze({ ...task.result })
    );
  }

  get tasks() {
    return [...this.#tasks.values()];
  }

  getTask(name: string) {
    return this.#tasks.get(name);
  }
}
