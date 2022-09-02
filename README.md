# tinybench

Benchmark your code easily with Tinybench, a simple, tiny and light-weight `7KB` (`2KB` minified and gzipped)
benchmarking library!
You can run your benchmarks in multiple JavaScript runtimes, Tinybench is
completely based on the Web APIs with proper timing using `process.hrtime` or
`performance.now`.

- Accurate and precise timing based on the environment
- `Event` and `EventTarget` compatible events
- Statistically analyzed values
- Calculated Percentiles
- Fully detailed results
- No dependencies

_In case you need more tiny libraries like tinypool or tinyspy, please consider submitting an [RFC](https://github.com/tinylibs/rfcs)_

## Installing

```bash
$ npm install -D tinybench
```

## Usage

You can start benchmarking by instantiating the `Bench` class and adding
benchmark tasks to it.

```ts
import { Bench } from 'tinybench';

const bench = new Bench({ time: 100 });

bench
  .add('switch 1', () => {
    let a = 1;
    let b = 2;
    const c = a;
    a = b;
    b = c;
  })
  .add('switch 2', () => {
    let a = 1;
    let b = 10;
    a = b + a;
    b = a - b;
    a = b - a;
  });

await bench.run();

console.table(bench.tasks.map(({ name, result }) => ({ "Task Name": name, "Average Time (ps)": result?.mean! * 1000, "Variance (ps)": result?.variance! * 1000 })));

// Output:
// ┌─────────┬────────────┬────────────────────┬────────────────────┐
// │ (index) │ Task Name  │ Average Time (ps)  │   Variance (ps)    │
// ├─────────┼────────────┼────────────────────┼────────────────────┤
// │    0    │ 'switch 1' │ 1.8458325710527104 │ 1.2113875253341617 │
// │    1    │ 'switch 2' │ 1.8746935152109603 │ 1.2254725890767446 │
// └─────────┴────────────┴────────────────────┴────────────────────┘
```

The `add` method accepts a task name and a task function, so it can benchmark
it! This method returns a reference to the Bench instance, so it's possible to
use it to create an another task for that instance.

Note that the task name should always be unique in an instance, because Tinybench stores the tasks based
on their names in a `Map`.

Also note that `tinybench` does not log any result by default. You can extract the relevant stats
from `bench.tasks` or any other API after running the benchmark, and process them however you want.

## Docs

### `Bench`

The Benchmark instance for keeping track of the benchmark tasks and controlling
them.

Options:

```ts
export type Options = {
  /**
   * time needed for running a benchmark task (milliseconds) @default 500
   */
  time?: number;

  /**
   * number of times that a task should run if even the time option is finished @default 10
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
   * warmup time (milliseconds) @default 100ms
   */
  warmupTime?: number;

  /**
   * warmup iterations @default 5
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
};

export type Hook = (task: Task, mode: "warmup" | "run") => void | Promise<void>;
```

- `async run()`: run the added tasks that were registered using the `add` method
- `async warmup()`: warm up the benchmark tasks
- `reset()`: reset each task and remove its result
- `add(name: string, fn: Fn)`: add a benchmark task to the task map
- - `Fn`: `() => any | Promise<any>`
- `remove(name: string)`: remove a benchmark task from the task map
- `get results(): (TaskResult | undefined)[]`: (getter) tasks results as an array
- `get tasks(): Task[]`: (getter) tasks as an array
- `getTask(name: string): Task | undefined`: get a task based on the name

### `Task`

A class that represents each benchmark task in Tinybench. It keeps track of the
results, name, Bench instance, the task function and the number of times the task
function has been executed.

- `constructor(bench: Bench, name: string, fn: Fn)`
- `bench: Bench`
- `name: string`: task name
- `fn: Fn`: the task function
- `runs: number`: the number of times the task function has been executed
- `result?: TaskResult`: the result object
- `async run()`: run the current task and write the results in `Task.result` object
- `async warmup()`: warm up the current task
- `setResult(result: Partial<TaskResult>)`: change the result object values
- `reset()`: reset the task to make the `Task.runs` a zero-value and remove the `Task.result` object

## `TaskResult`

the benchmark task result object.

```ts
export type TaskResult = {

  /*
   * the last error that was thrown while running the task
   */
  error?: unknown;

  /**
   * The amount of time in milliseconds to run the benchmark task (cycle).
   */
  totalTime: number;

  /**
   * the minimum value in the samples
   */
  min: number;
  /**
   * the maximum value in the samples
   */
  max: number;

  /**
   * the number of operations per second
   */
  hz: number;

  /**
   * how long each operation takes (ms)
   */
  period: number;

  /**
   * task samples of each task iteration time (ms)
   */
  samples: number[];

  /**
   * samples mean/average (estimate of the population mean)
   */
  mean: number;

  /**
   * samples variance (estimate of the population variance)
   */
  variance: number;

  /**
   * samples standard deviation (estimate of the population standard deviation)
   */
  sd: number;

  /**
   * standard error of the mean (a.k.a. the standard deviation of the sampling distribution of the sample mean)
   */
  sem: number;

  /**
   * degrees of freedom
   */
  df: number;

  /**
   * critical value of the samples
   */
  critical: number;

  /**
   * margin of error
   */
  moe: number;

  /**
   * relative margin of error
   */
  rme: number;

  /**
   * p75 percentile
   */
  p75: number;

  /**
   * p99 percentile
   */
  p99: number;

  /**
   * p995 percentile
   */
  p995: number;

  /**
   * p999 percentile
   */
  p999: number;
};
```

### `Events`

Both the `Task` and `Bench` objects extend the `EventTarget` object, so you can attach listeners to different types of events
in each class instance using the universal `addEventListener` and
`removeEventListener`.

```ts
/**
 * Bench events
 */
export type BenchEvents =
  | "abort" // when a signal aborts
  | "complete" // when running a benchmark finishes
  | "error" // when the benchmark task throws
  | "reset" // when the reset function gets called
  | "start" // when running the benchmarks gets started
  | "warmup" // when the benchmarks start getting warmed up (before start)
  | "cycle" // when running each benchmark task gets done (cycle)
  | "add" // when a Task gets added to the Bench
  | "remove"; // when a Task gets removed of the Bench

/**
 * task events
 */
export type TaskEvents =
  | "abort"
  | "complete"
  | "error"
  | "reset"
  | "start"
  | "warmup"
  | "cycle";
```

For instance:

```ts
// runs on each benchmark task's cycle
bench.addEventListener("cycle", (e: BenchEvent) => {
  const task = e.task!;
});

// runs only on this benchmark task's cycle
task.addEventListener("cycle", (e: BenchEvent) => {
  const task = e.task!;
});
```

### `BenchEvent`

```ts
export type BenchEvent = Event & {
  task: Task | null;
};
```

## Prior art

- [Benchmark.js](https://github.com/bestiejs/benchmark.js)
- [Mitata](https://github.com/evanwashere/mitata/)
- [Bema](https://github.com/prisma-labs/bema)

## Authors

| <a href="https://github.com/Aslemammad"> <img width='150' src="https://avatars.githubusercontent.com/u/37929992?v=4" /><br> Mohammad Bagher </a> |
| ------------------------------------------------------------------------------------------------------------------------------------------------ |

## Credits

| <a href="https://github.com/uzploak"> <img width='150' src="https://avatars.githubusercontent.com/u/5059100?v=4" /><br> Uzlopak </a> | <a href="https://github.com/poyoho"> <img width='150' src="https://avatars.githubusercontent.com/u/36070057?v=4" /><br> poyoho </a> |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |

## Contributing

Feel free to create issues/discussions and then PRs for the project!
