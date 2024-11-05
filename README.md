# Tinybench 🔎

[![CI](https://github.com/tinylibs/tinybench/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/tinylibs/tinybench/actions/workflows/test.yml)
[![NPM version](https://img.shields.io/npm/v/tinybench.svg?style=flat)](https://www.npmjs.com/package/tinybench)

Benchmark your code easily with Tinybench, a simple, tiny and light-weight `10KB` (`2KB` minified and gzipped) benchmarking library!
You can run your benchmarks in multiple JavaScript runtimes, Tinybench is completely based on the Web APIs with proper timing using
`process.hrtime` or `performance.now`.

- Accurate and precise timing based on the environment
- Statistically analyzed latency and throughput values: standard deviation, margin of error, variance, percentiles, etc.
- Concurrency support
- `Event` and `EventTarget` compatible events
- No dependencies

_In case you need more tiny libraries like tinypool or tinyspy, please consider submitting an [RFC](https://github.com/tinylibs/rfcs)_

## Installing

```shell
$ npm install -D tinybench
```

## Usage

You can start benchmarking by instantiating the `Bench` class and adding benchmark tasks to it.

```js
import { Bench } from 'tinybench';

const bench = new Bench({ name: 'simple benchmark', time: 100 });

bench
  .add('faster task', () => {
    console.log('I am faster');
  })
  .add('slower task', async () => {
    await new Promise((r) => setTimeout(r, 1)); // we wait 1ms :)
    console.log('I am slower');
  });

await bench.run();

console.log(bench.name);
console.table(bench.table());

// Output:
// simple benchmark
// ┌─────────┬───────────────┬────────────────────────────┬───────────────────────────┬──────────────────────┬─────────────────────┬─────────┐
// │ (index) │ Task name     │ Throughput average (ops/s) │ Throughput median (ops/s) │ Latency average (ns) │ Latency median (ns) │ Samples │
// ├─────────┼───────────────┼────────────────────────────┼───────────────────────────┼──────────────────────┼─────────────────────┼─────────┤
// │ 0       │ 'faster task' │ '102906 ± 0.89%'           │ '82217 ± 14'              │ '11909.14 ± 3.95%'   │ '12163.00 ± 2.00'   │ 8398    │
// │ 1       │ 'slower task' │ '988 ± 26.26%'             │ '710'                     │ '1379560.47 ± 6.72%' │ '1408552.00'        │ 73      │
// └─────────┴───────────────┴────────────────────────────┴───────────────────────────┴──────────────────────┴─────────────────────┴─────────┘
```

The `add` method accepts a task name and a task function, so it can benchmark
it! This method returns a reference to the Bench instance, so it's possible to
use it to create an another task for that instance.

Note that the task name should always be unique in an instance, because Tinybench stores the tasks based
on their names in a `Map`.

Also note that `tinybench` does not log any result by default. You can extract the relevant stats
from `bench.tasks` or any other API after running the benchmark, and process them however you want.

More usage examples can be found in the [examples](./examples/) directory.

## Docs

### `Bench`

The Benchmark instance for keeping track of the benchmark tasks and controlling
them.

Options:

```ts
export interface Options {
  /**
   * benchmark name
   */
  name?: string;

  /**
   * time needed for running a benchmark task (milliseconds) @default 1000
   */
  time?: number;

  /**
   * number of times that a task should run if even the time option is finished @default 64
   */
  iterations?: number;

  /**
   * function to get the current timestamp in milliseconds
   */
  now?: () => number;

  /**
   * An AbortSignal for aborting the benchmark
   */
  signal?: AbortSignal;

  /**
   * Throws if a task fails @default false
   */
  throws?: boolean;

  /**
   * warmup benchmark @default true
   */
  warmup?: boolean;

  /**
   * warmup time (milliseconds) @default 250
   */
  warmupTime?: number;

  /**
   * warmup iterations @default 16
   */
  warmupIterations?: number;

  /**
   * setup function to run before each benchmark task (cycle)
   */
  setup?: Hook;

  /**
   * teardown function to run after each benchmark task (cycle)
   */
  teardown?: Hook;
}

export type Hook = (task: Task, mode: 'warmup' | 'run') => void | Promise<void>;
```

- `async run()`: run the added tasks that were registered using the `add` method
- `reset()`: reset each task and remove its result
- `add(name: string, fn: Fn, opts?: FnOpts)`: add a benchmark task to the task map
  - `Fn`: `() => unknown | Promise<unknown>`
  - `FnOpts`: `{}`: a set of optional functions run during the benchmark lifecycle that can be used to set up or tear down test data or fixtures without affecting the timing of each task
    - `beforeAll?: () => void | Promise<void>`: invoked once before iterations of `fn` begin
    - `beforeEach?: () => void | Promise<void>`: invoked before each time `fn` is executed
    - `afterEach?: () => void | Promise<void>`: invoked after each time `fn` is executed
    - `afterAll?: () => void | Promise<void>`: invoked once after all iterations of `fn` have finished
- `remove(name: string)`: remove a benchmark task from the task map
- `table()`: table of the tasks results
- `get results(): (Readonly<TaskResult> | undefined)[]`: (getter) tasks results as an array
- `get tasks(): Task[]`: (getter) tasks as an array
- `getTask(name: string): Task | undefined`: get a task based on the name

### `Task`

A class that represents each benchmark task in Tinybench. It keeps track of the
results, name, Bench instance, the task function and the number of times the task
function has been executed.

- `constructor(bench: Bench, name: string, fn: Fn, opts: FnOptions = {})`
- `bench: Bench`
- `name: string`: task name
- `fn: Fn`: the task function
- `opts: FnOptions`: Task options
- `runs: number`: the number of times the task function has been executed
- `result?: Readonly<TaskResult>`: the result object
- `async run()`: run the current task and write the results in `Task.result` object property (internal)
- `async warmup()`: warmup the current task (internal)
- `reset()`: reset the task to make the `Task.runs` a zero-value and remove the `Task.result` object property (internal)

FnOptions:

```ts
export interface FnOptions {
  /**
   * An optional function that is run before iterations of this task begin
   */
  beforeAll?: (this: Task) => void | Promise<void>;

  /**
   * An optional function that is run before each iteration of this task
   */
  beforeEach?: (this: Task) => void | Promise<void>;

  /**
   * An optional function that is run after each iteration of this task
   */
  afterEach?: (this: Task) => void | Promise<void>;

  /**
   * An optional function that is run after all iterations of this task end
   */
  afterAll?: (this: Task) => void | Promise<void>;
}
```

### `TaskResult`

The benchmark task result object:

```ts
export interface TaskResult {
  /**
   * the JavaScript runtime environment
   */
  runtime: JSRuntime | 'unknown';

  /**
   * the JavaScript runtime version
   */
  runtimeVersion: string;

  /**
   * the last task error that was thrown
   */
  error?: Error;

  /**
   * the time to run the task benchmark cycle (ms)
   */
  totalTime: number;

  /**
   * how long each operation takes (ms)
   */
  period: number;

  /**
   * the task latency statistics
   */
  latency: Statistics;

  /**
   * the task throughput statistics
   */
  throughput: Statistics;

  /**
   * the number of operations per second
   * @deprecated use `.throughput.mean` instead
   */
  hz: number;

  /**
   * latency samples (ms)
   * @deprecated use `.latency.samples` instead
   */
  samples: number[];

  /**
   * the minimum latency samples value
   * @deprecated use `.latency.min` instead
   */
  min: number;

  /**
   * the maximum latency samples value
   * @deprecated use `.latency.max` instead
   */
  max: number;

  /**
   * the latency samples mean/average (estimate of the population mean/average)
   * @deprecated use `.latency.mean` instead
   */
  mean: number;

  /**
   * the latency samples variance (estimate of the population variance)
   * @deprecated use `.latency.variance` instead
   */
  variance: number;

  /**
   * the latency samples standard deviation (estimate of the population standard deviation)
   * @deprecated use `.latency.sd` instead
   */
  sd: number;

  /**
   * the latency standard error of the mean (a.k.a. the standard deviation of the sampling distribution of the sample mean/average)
   * @deprecated use `.latency.sem` instead
   */
  sem: number;

  /**
   * the latency samples degrees of freedom
   * @deprecated use `.latency.df` instead
   */
  df: number;

  /**
   * the latency samples critical value
   * @deprecated use `.latency.critical` instead
   */
  critical: number;

  /**
   * the latency samples margin of error
   * @deprecated use `.latency.moe` instead
   */
  moe: number;

  /**
   * the latency samples relative margin of error
   * @deprecated use `.latency.rme` instead
   */
  rme: number;

  /**
   * the latency samples p75 percentile
   * @deprecated use `.latency.p75` instead
   */
  p75: number;

  /**
   * the latency samples p99 percentile
   * @deprecated use `.latency.p99` instead
   */
  p99: number;

  /**
   * the latency samples p995 percentile
   * @deprecated use `.latency.p995` instead
   */
  p995: number;

  /**
   * the latency samples p999 percentile
   * @deprecated use `.latency.p999` instead
   */
  p999: number;
}
```

[Statistics](https://github.com/tinylibs/tinybench/blob/main/src/types.ts#L31) type definition.

### `Events`

Both the `Task` and `Bench` objects extend the `EventTarget` object, so you can attach listeners to different types of events
in each class instance using the universal `addEventListener` and
`removeEventListener`.

```ts
/**
 * Bench events
 */
export type BenchEvents =
  | 'abort' // when a signal aborts
  | 'complete' // when running a benchmark finishes
  | 'error' // when the benchmark task throws
  | 'reset' // when the reset function gets called
  | 'start' // when running the benchmarks gets started
  | 'warmup' // when the benchmarks start getting warmed up (before start)
  | 'cycle' // when running each benchmark task gets done (cycle)
  | 'add' // when a Task gets added to the Bench
  | 'remove'; // when a Task gets removed of the Bench

/**
 * task events
 */
export type TaskEvents = 'abort' | 'complete' | 'error' | 'reset' | 'start' | 'warmup' | 'cycle';
```

For instance:

```js
// runs on each benchmark task's cycle
bench.addEventListener('cycle', (evt) => {
  const task = evt.task!;
});

// runs only on this benchmark task's cycle
task.addEventListener('cycle', (evt) => {
  const task = evt.task!;
});
```

### `BenchEvent`

```ts
export type BenchEvent = Event & { error?: Error; task?: Task };
```

### `process.hrtime`

if you want more accurate results for nodejs with `process.hrtime`, then import
the `hrtimeNow` function from the library and pass it to the `Bench` options.

```ts
import { hrtimeNow } from 'tinybench';
```

It may make your benchmarks slower, check [#42](https://github.com/tinylibs/tinybench/issues/42).

## Concurrency

- When `mode` is set to `null` (default), concurrency is disabled.
- When `mode` is set to 'task', each task's iterations (calls of a task function) run concurrently.
- When `mode` is set to 'bench', different tasks within the bench run concurrently. Concurrent cycles.

```ts
bench.threshold = 10; // The maximum number of concurrent tasks to run. Defaults to Number.POSITIVE_INFINITY.
bench.concurrency = 'task'; // The concurrency mode to determine how tasks are run.
await bench.run();
```

## Prior art

- [Benchmark.js](https://github.com/bestiejs/benchmark.js)
- [mitata](https://github.com/evanwashere/mitata/)
- [tatami-ng](https://github.com/poolifier/tatami-ng)
- [Bema](https://github.com/prisma-labs/bema)

## Authors

| <a href="https://github.com/Aslemammad"> <img width='150' src="https://avatars.githubusercontent.com/u/37929992?v=4" /><br> Mohammad Bagher </a> |
| ------------------------------------------------------------------------------------------------------------------------------------------------ |

## Credits

| <a href="https://github.com/uzlopak"> <img width='150' src="https://avatars.githubusercontent.com/u/5059100?v=4" /><br> Uzlopak </a> | <a href="https://github.com/poyoho"> <img width='150' src="https://avatars.githubusercontent.com/u/36070057?v=4" /><br> poyoho </a> |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |

## Contributing

Feel free to create issues/discussions and then PRs for the project!

## Sponsors

Your sponsorship can make a huge difference in continuing our work in open source!

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/aslemammad/static/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/aslemammad/static/sponsors.svg'/>
  </a>
</p>
