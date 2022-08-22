import { sign } from "crypto";
import { tTable } from "./constants";
import { BenchEvent } from "./event";
import { Task } from "./task";
import type { Events, Fn, Options, TaskResult } from "./types";
import { now, getMean, getVariance } from "./utils";

export class Bench extends EventTarget {
  #tasks: Map<string, Task> = new Map();
  signal?: AbortSignal;
  time = 100;
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
      if (this.signal?.aborted) {
        return task;
      }
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
    } while (totalTime < this.time);

    samples.sort();

    const min = samples[0]!;
    const max = samples[samples.length - 1]!;
    const period = totalTime / task.runs;
    const hz = 1 / period;

    const mean = getMean(samples);
    const variance = getVariance(samples, mean);
    const sd = Math.sqrt(variance);
    const sem = sd / Math.sqrt(samples.length);
    const df = samples.length - 1;
    const critical = tTable[String(Math.round(df) || 1)] || tTable.infinity!;
    const moe = sem * critical;
    const rme = (moe / mean) * 100 || 0;

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

    if (task.result?.error) {
      this.dispatchEvent(new BenchEvent("error", task));
    }

    this.dispatchEvent(new BenchEvent("cycle", task));

    return task;
  }

  async run() {
    this.dispatchEvent(new Event("start"));
    const values = await Promise.all(
      [...this.#tasks.entries()].map(([_, task]) => {
        return this.runTask(task);
      })
    );
    this.dispatchEvent(new Event("complete"));
    return values;
  }

  reset() {
    this.dispatchEvent(new Event("reset"));
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
    super.removeEventListener(type, listener, options);
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
