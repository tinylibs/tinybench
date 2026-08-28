import { Bench, mToNs, type Statistics, type Task } from '../../src'

type BencherBenchmark = Record<'latency' | 'throughput', BencherMetric>

interface BencherMetric {
  lower_value: number
  upper_value: number
  value: number
}

type BencherMetricFormat = Record<string, BencherBenchmark>

const toMetric = (
  statistics: Statistics,
  convert: (value: number) => number = value => value
): BencherMetric => {
  const value = convert(statistics.mean)
  const marginOfError = convert(statistics.moe)

  // The bounds are Tinybench's two-sided 95% Student's t confidence interval
  // for the sample mean, not sample dispersion or a Bencher threshold.
  return {
    lower_value: Math.max(0, value - marginOfError),
    upper_value: value + marginOfError,
    value,
  }
}

const toBencherMetricFormat = (tasks: readonly Task[]): BencherMetricFormat => {
  const entries: [string, BencherBenchmark][] = []

  for (const task of tasks) {
    const { result } = task
    if (result.state !== 'completed') {
      continue
    }

    entries.push([
      task.name,
      {
        latency: toMetric(result.latency, mToNs),
        throughput: toMetric(result.throughput),
      },
    ])
  }

  return Object.fromEntries(entries)
}

const bench = new Bench({ time: 100 })

bench
  .add('faster task', () => 1 + 1)
  .add('slower task', () => Math.sqrt(2))

await bench.run()

// BMF's built-in latency and throughput measures use ns and ops/s.
console.log(JSON.stringify(toBencherMetricFormat(bench.tasks), null, 2))
