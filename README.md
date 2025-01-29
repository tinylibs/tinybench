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

## `process.hrtime`

if you want more accurate results for nodejs with `process.hrtime`, then import
the `hrtimeNow` function from the library and pass it to the `Bench` options.

```ts
import { hrtimeNow } from 'tinybench'
```

It may make your benchmarks slower.

## Concurrency

- When `mode` is set to `null` (default), concurrency is disabled.
- When `mode` is set to 'task', each task's iterations (calls of a task function) run concurrently.
- When `mode` is set to 'bench', different tasks within the bench run concurrently. Concurrent cycles.

```ts
bench.threshold = 10 // The maximum number of concurrent tasks to run. Defaults to Number.POSITIVE_INFINITY.
bench.concurrency = 'task' // The concurrency mode to determine how tasks are run.
await bench.run()
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
