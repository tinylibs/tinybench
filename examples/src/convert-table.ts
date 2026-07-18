import {
  Bench,
  type ConsoleTableConverter,
  formatNumber,
  mToNs,
  type Task,
} from '../../src'

// A custom converter for `bench.table()` that renders a compact,
// latency-only view — omitting the throughput columns the default converter
// includes. Pass any function with the `ConsoleTableConverter` signature to
// `bench.table()` to customize the rows `console.table` prints.
const compactConverter: ConsoleTableConverter = (task: Task): Record<string, number | string> => {
  const state = task.result.state
  return {
    'Task name': task.name,
    ...(state === 'aborted-with-statistics' || state === 'completed'
      ? {
          'Latency avg (ns)': `${formatNumber(mToNs(task.result.latency.mean))} \xb1 ${task.result.latency.rme.toFixed(2)}%`,
          'Latency med (ns)': `${formatNumber(mToNs(task.result.latency.p50))} \xb1 ${formatNumber(mToNs(task.result.latency.mad))}`,
          Samples: task.result.latency.samplesCount,
        }
      : state !== 'errored'
        ? {
            'Latency avg (ns)': 'N/A',
            'Latency med (ns)': 'N/A',
            Samples: 'N/A',
            Remarks: state,
          }
        : {
            Error: task.result.error.message,
          }),
  }
}

const bench = new Bench({ name: 'compact table benchmark', time: 100 })

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
console.table(bench.table(compactConverter))
