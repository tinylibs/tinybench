# Frequently Asked Questions

## How do I deal with measurement precision issues?

If a task runs faster than the resolution of the timer your runtime provides,
individual samples can measure as zero duration, which skews the reported
latency. After each run, Tinybench exposes `detectedResolution`: the smallest
positive timer-measured sample occurring at least twice, or the smallest
positive sample if none repeats. Samples are considered after any overhead
correction; the result is `undefined` if none is positive. This is a heuristic,
not a guaranteed timer-resolution bound. With at least 10 such samples, a
`'warning'` event can indicate timer-dominated results; see
[Timer Diagnostics](./README.md#timer-diagnostics). Timer resolution varies
by runtime and platform.

Tinybench lets you choose a timestamp provider via the `timestampProvider`
option, which accepts a `TimestampProvider` object or the shorthands
`hrtimeNow`, `performanceNow`, `bunNanoseconds` (when running on Bun), or `auto`
(to let Tinybench pick the most precise available provider for the current
runtime). See the README
[Timestamp Providers](./README.md#timestamp-providers) section for the full
list, an example, and custom-provider setup. To supply a plain millisecond
clock without building a `TimestampProvider`, set the `now` option instead; it
is converted to a provider internally and cannot be combined with
`timestampProvider`.

Beyond picking a higher-resolution provider, you can increase the benchmark
`time` so more samples are collected (improving statistical confidence).
Use the `'warning'` event and `detectedResolution` as heuristic indicators
(see [Timer Diagnostics](./README.md#timer-diagnostics)), not proof of a timer
limitation. The relative margin of error (`rme`) alone is insufficient:
a saturated task can report either a very high or a very low `rme`.
Manually looping a fast function to "amplify" its duration can lift a sample
above the timer resolution, but it adds loop overhead and changes what you
measure; a more precise timestamp provider is usually the cleaner fix.

## What is JS JIT de-optimization?

JavaScript engines (V8, SpiderMonkey, JavaScriptCore) compile hot code paths
just-in-time (JIT). JIT de-optimization (a "deopt") happens when the engine
discards an optimized code path and falls back to a lower, unoptimized
execution tier (a bytecode interpreter or a less-optimized JIT tier, depending
on the engine). During benchmarking this can show up as sudden latency spikes.

Common causes include type instability (argument types changing between
iterations) and dynamic property access or function reassignment that prevents
inlining. Garbage-collection pauses are a separate source of latency spikes
(not a deopt) that can likewise inflate variance, and — in browsers — having
DevTools open adds overhead and can disable some JIT optimizations rather than
being a deopt itself.

Tinybench reports statistical indicators (standard deviation, variance,
percentiles, margin of error) that help you spot outliers caused by deopts. If
you see high variance, try running the benchmark multiple times and comparing
results, keeping warmup enabled (the default; tunable via `warmupIterations` /
`warmupTime`), and (in browsers) closing DevTools and running in a
production-like configuration.

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
- **Warmup handling.** Tools differ in whether they warm up before measuring.
  Tinybench warms up by default (`warmup`, on by default) in a separate phase
  excluded from the reported statistics; disabling it (`warmup: false`) lets the
  first measured samples include JIT warmup cost.
- **Overhead.** Every tool introduces its own measurement overhead (loop,
  function call, event dispatch). Tinybench is small, but not zero-overhead.

When comparing across tools, focus on the **relative** difference (is
implementation A faster than B?) rather than the absolute operations-per-second
numbers, and run the comparison on the same machine in the same environment.
