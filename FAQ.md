# Frequently Asked Questions

## How do I deal with measurement precision issues?

If a task runs faster than the resolution of the timer your runtime provides,
individual samples can measure as zero duration, which produces unreliable
results (high margin of error, skewed latency). The resolution of the default
timer varies by runtime and platform.

Tinybench lets you choose a timestamp provider via the `timestampProvider`
option, which accepts a `TimestampProvider` object or the shorthands
`hrtimeNow`, `performanceNow`, `bunNanoseconds` (when running on Bun), or `auto`
(to let Tinybench pick the best available provider for the current runtime):

```ts
import { Bench } from 'tinybench'

const bench = new Bench({
  timestampProvider: 'hrtimeNow', // or 'performanceNow', 'bunNanoseconds', 'auto'
})
```

Beyond picking a higher-resolution provider, you can increase the benchmark
`time` so more samples are collected (improving statistical confidence), and
inspect the reported margin of error (`rme`) — a very high `rme` often signals
that the task executes faster than the timer can measure accurately. Looping a
fast function to "amplify" its duration does not fix the underlying precision
problem; prefer a more precise timestamp provider.

## What is JS JIT de-optimization?

JavaScript engines (V8, SpiderMonkey, JavaScriptCore) compile hot code paths
just-in-time (JIT). JIT de-optimization (a "deopt") happens when the engine
discards an optimized code path and falls back to slower, interpreted
execution. During benchmarking this can show up as sudden latency spikes.

Common causes include type instability (argument types changing between
iterations), garbage-collection pauses interrupting the measured region,
dynamic property access or function reassignment that prevents inlining, and —
in browsers — having DevTools open, which disables many JIT optimizations.

Tinybench reports statistical indicators (standard deviation, variance,
percentiles, margin of error) that help you spot outliers caused by deopts. If
you see high variance, try running the benchmark multiple times and comparing
results, ensuring warmup iterations run before measurement, and (in browsers)
closing DevTools and running in a production-like configuration.

## Why do my results differ from another benchmarking tool?

Differences between benchmarking tools are expected and do not necessarily
indicate a bug. Common reasons:

- **Different timing APIs.** Tools may use `Date.now()`, `performance.now()`,
  or `process.hrtime.bigint()`, each with different resolution and overhead.
- **Different measurement methodology.** Some tools measure a single iteration;
  Tinybench collects many samples over a configurable `time` window and reports
  statistically analyzed latency and throughput (mean, median, p75/p99,
  standard deviation, margin of error).
- **Different statistics.** Tools aggregate differently (arithmetic mean,
  geometric mean, median, …). Tinybench reports both average and median (p50).
- **Warmup handling.** Some tools include warmup runs in their measurements;
  the first samples Tinybench collects may include JIT warmup cost.
- **Overhead.** Every tool introduces its own measurement overhead (loop,
  function call, event dispatch). Tinybench is small, but not zero-overhead.

When comparing across tools, focus on the **relative** difference (is
implementation A faster than B?) rather than the absolute operations-per-second
numbers, and run the comparison on the same machine in the same environment.
