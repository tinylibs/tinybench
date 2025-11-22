# Tinybench 🔎

[![CI](https://github.com/tinylibs/tinybench/actions/workflows/qa.yml/badge.svg?branch=main)](https://github.com/tinylibs/tinybench/actions/workflows/qa.yml)
[![NPM version](https://badgen.net/npm/v/tinybench?icon=npm)](https://www.npmjs.com/package/tinybench)
[![Discord](https://badgen.net/discord/online-members/c3UUYNcHrU?icon=discord&label=discord&color=green)](https://discord.gg/c3UUYNcHrU)
[![neostandard Javascript Code Style](<https://badgen.net/static/code style/neostandard/green>)](https://github.com/neostandard/neostandard)

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
import { Bench } from 'tinybench'

const bench = new Bench({ name: 'simple benchmark', time: 100 })

bench
  .add('faster task', () => {
    console.log('I am faster')
  })
  .add('slower task', async () => {
    await new Promise(resolve => setTimeout(resolve, 1)) // we wait 1ms :)
    console.log('I am slower')
  })

await bench.run()

console.log(bench.name)
console.table(bench.table())

// Output:
// simple benchmark
// ┌─────────┬───────────────┬───────────────────┬───────────────────────┬────────────────────────┬────────────────────────┬─────────┐
// │ (index) │ Task name     │ Latency avg (ns)  │ Latency med (ns)      │ Throughput avg (ops/s) │ Throughput med (ops/s) │ Samples │
// ├─────────┼───────────────┼───────────────────┼───────────────────────┼────────────────────────┼────────────────────────┼─────────┤
// │ 0       │ 'faster task' │ '63768 ± 4.02%'   │ '58954 ± 15255.00'    │ '18562 ± 1.67%'        │ '16962 ± 4849'         │ 1569    │
// │ 1       │ 'slower task' │ '1542543 ± 7.14%' │ '1652502 ± 167851.00' │ '808 ± 19.65%'         │ '605 ± 67'             │ 65      │
// └─────────┴───────────────┴───────────────────┴───────────────────────┴────────────────────────┴────────────────────────┴─────────┘
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

### [`Bench`](https://tinylibs.github.io/tinybench/classes/Bench.html)

### [`Task`](https://tinylibs.github.io/tinybench/classes/Task.html)

### [`TaskResult`](https://tinylibs.github.io/tinybench/interfaces/TaskResult.html)

### `Events`

Both the `Task` and `Bench` classes extend the `EventTarget` object. So you can attach listeners to different types of events in each class instance using the universal `addEventListener` and `removeEventListener` methods.

#### [`BenchEvents`](https://tinylibs.github.io/tinybench/types/BenchEvents.html)

```js
// runs on each benchmark task's cycle
bench.addEventListener('cycle', (evt) => {
  const task = evt.task!;
});
```

#### [`TaskEvents`](https://tinylibs.github.io/tinybench/types/TaskEvents.html)

```js
// runs only on this benchmark task's cycle
task.addEventListener('cycle', (evt) => {
  const task = evt.task!;
});
```

### [`BenchEvent`](https://tinylibs.github.io/tinybench/types/BenchEvent.html)

## Async Detection

Tinybench automatically detects if a task function is asynchronous by
checking if provided function is an `AsyncFunction` or if it returns a
`Promise`, by calling the provided function once.

You can also explicitly set the `async` option to `true` or `false` when adding
a task, thus avoiding the detection. This can be useful, for example, for
functions that return a `Promise` but are actually synchronous.

```ts
const bench = new Bench()

bench.add('asyncTask', async () => {
}, { async: true })

bench.add('syncTask', () => {
}, { async: false })

bench.add('syncTaskReturningPromiseAsAsync', () => {
  return Promise.resolve()
}, { async: true })

bench.add('syncTaskReturningPromiseAsSync', () => {
  // for example running sync logic, which blocks the event loop anyway
  // like fs.writeFileSync

  // returns promise maybe for API compatibility
  return Promise.resolve()
}, { async: false })

await bench.run()
```

## Concurrency

- When `mode` is set to `null` (default), concurrency is disabled.
- When `mode` is set to 'task', each task's iterations (calls of a task function) run concurrently.
- When `mode` is set to 'bench', different tasks within the bench run concurrently. Concurrent cycles.

```ts
bench.threshold = 10 // The maximum number of concurrent tasks to run. Defaults to Number.POSITIVE_INFINITY.
bench.concurrency = 'task' // The concurrency mode to determine how tasks are run.
await bench.run()
```

## Convert task results for `console.table()`

You can convert the benchmark results to a table format suitable for
`console.table()` using the `bench.table()` method.

```ts
const table = bench.table()
console.table(table)
```

You can also customize the table output by providing a convert-function to the `table` method.

```ts
import { Bench, type ConsoleTableConverter, formatNumber, mToNs, type Task } from 'tinybench'

/**
 * The default converter function for console.table output.
 * Modify it as needed to customize the table format.
 */
const defaultConverter: ConsoleTableConverter = (
  task: Task
): Record<string, number | string> => {
  const state = task.result.state
  return {
    'Task name': task.name,
    ...(state === 'aborted-with-statistics' || state === 'completed'
      ? {
          'Latency avg (ns)': `${formatNumber(mToNs(task.result.latency.mean))} \xb1 ${task.result.latency.rme.toFixed(2)}%`,
          'Latency med (ns)': `${formatNumber(mToNs(task.result.latency.p50))} \xb1 ${formatNumber(mToNs(task.result.latency.mad))}`,
          'Throughput avg (ops/s)': `${Math.round(task.result.throughput.mean).toString()} \xb1 ${task.result.throughput.rme.toFixed(2)}%`,
          'Throughput med (ops/s)': `${Math.round(task.result.throughput.p50).toString()} \xb1 ${Math.round(task.result.throughput.mad).toString()}`,
          Samples: task.result.latency.samplesCount,
        }
      : state !== 'errored'
        ? {
            'Latency avg (ns)': 'N/A',
            'Latency med (ns)': 'N/A',
            'Throughput avg (ops/s)': 'N/A',
            'Throughput med (ops/s)': 'N/A',
            Samples: 'N/A',
            Remarks: state,
          }
        : {
            Error: task.result.error.message,
            Stack: task.result.error.stack ?? 'N/A',
          }),
    ...(state === 'aborted-with-statistics' && {
      Remarks: state,
    }),
  }
}

const bench = new Bench({ name: 'custom table benchmark', time: 100 })
// add tasks...

console.table(bench.table(defaultConverter))
```

## Retaining Samples

By default Tinybench does not keep the samples for `latency` and `throughput` to
minimize memory usage. Enable sample retention if you need the raw samples for
plotting, custom analysis, or exporting results.

You can enable samples retention at the bench level by setting the
`retainSamples` option to `true` when creating a `Bench` instance:

```ts
const bench = new Bench({ retainSamples: true })
```

You can also enable samples retention by setting the `retainSamples` option to
`true` when adding a task:

```ts
bench.add('task with samples', () => {
  // Task logic here
}, { retainSamples: true })
```

## Timestamp Providers

Tinybench can utilize different timestamp providers for measuring time intervals.
By default it uses `performance.now()`.

The `timestampProvider` option can be set when creating a `Bench` instance. It
accepts either a `TimestampProvider` object or shorthands for the common
providers `hrtimeNow` and `performanceNow`.

If you use `bun` runtime, you can also use `bunNanoseconds` shorthand.

You can set the `timestampProvider` to `auto` to let Tinybench choose the most
precise available timestamp provider based on the runtime.

```ts
import { Bench } from 'tinybench'

const bench = new Bench({
  timestampProvider: 'hrtimeNow' // or 'performanceNow', 'bunNanoseconds', 'auto'
})
```

If you want to provide a custom timestamp provider, you can create an object that implements
the `TimestampProvider` interface:

```ts
import { Bench, TimestampProvider } from 'tinybench'

// Custom timestamp provider using Date.now()
const dateNowTimestampProvider: TimestampProvider = {
  name: 'dateNow', // name of the provider
  fn: Date.now, // function that returns the current timestamp
  toMs: ts => ts, // convert the timestamp to milliseconds
  fromMs: ts => ts // convert milliseconds to the format used by fn()
}

const bench = new Bench({
  timestampProvider: dateNowTimestampProvider
})
```

You can also set the `now` option to a function that returns the current timestamp.
It will be converted to a `TimestampProvider` internally.

```ts
import { Bench } from 'tinybench'

const bench = new Bench({
  now: Date.now
})
```

## Aborting Benchmarks

Tinybench supports aborting benchmarks using `AbortSignal` at both the bench and task levels:

### Bench-level Abort

Abort all tasks in a benchmark by passing a signal to the `Bench` constructor:

```ts
const controller = new AbortController()

const bench = new Bench({ signal: controller.signal })

bench
  .add('task1', () => {
    // This will be aborted
  })
  .add('task2', () => {
    // This will also be aborted
  })

// Abort all tasks
controller.abort()

await bench.run()
// Both tasks will be aborted
```

### Task-level Abort

Abort individual tasks without affecting other tasks by passing a signal to the task options:

```ts
const controller = new AbortController()

const bench = new Bench()

bench
  .add('abortable task', () => {
    // This task can be aborted independently
  }, { signal: controller.signal })
  .add('normal task', () => {
    // This task will continue normally
  })

// Abort only the first task
controller.abort()

await bench.run()
// Only 'abortable task' will be aborted, 'normal task' continues
```

### Abort During Execution

You can abort benchmarks while they're running:

```ts
const controller = new AbortController()

const bench = new Bench({ time: 10000 }) // Long-running benchmark

bench.add('long task', async () => {
  await new Promise(resolve => setTimeout(resolve, 100))
}, { signal: controller.signal })

// Abort after 1 second
setTimeout(() => controller.abort(), 1000)

await bench.run()
// Task will stop after ~1 second instead of running for 10 seconds
```

### Abort Events

Both `Bench` and `Task` emit `abort` events when aborted:

```ts
const controller = new AbortController()
const bench = new Bench()

bench.add('task', () => {
  // Task function
}, { signal: controller.signal })

const task = bench.getTask('task')

// Listen for abort events
task.addEventListener('abort', () => {
  console.log('Task aborted!')
})

bench.addEventListener('abort', () => {
  console.log('Bench received abort event!')
})

controller.abort()
await bench.run()
```

**Note:** When a task is aborted, `task.result.aborted` will be `true`, and the task will have completed any iterations that were running when the abort signal was received.

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
