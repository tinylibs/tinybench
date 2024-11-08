import { Bench } from '../../src'

const bench = new Bench({ name: 'simple benchmark', time: 100 })

bench
  .add('faster task', () => {
    console.log('I am faster')
  })
  .add('slower task', async () => {
    await new Promise((resolve) => setTimeout(resolve, 1)) // we wait 1ms :)
    console.log('I am slower')
  })

await bench.run()

console.log(bench.name)
console.table(bench.table())

// Output:
// simple benchmark
// ┌─────────┬───────────────┬────────────────────────────┬───────────────────────────┬──────────────────────┬─────────────────────┬─────────┐
// │ (index) │ Task name     │ Throughput average (ops/s) │ Throughput median (ops/s) │ Latency average (ns) │ Latency median (ns) │ Samples │
// ├─────────┼───────────────┼────────────────────────────┼───────────────────────────┼──────────────────────┼─────────────────────┼─────────┤
// │ 0       │ 'faster task' │ '102906 ± 0.89%'           │ '82217 ± 14'              │ '11909.14 ± 3.95%'   │ '12163.00 ± 2.00'   │ 8398    │
// │ 1       │ 'slower task' │ '988 ± 26.26%'             │ '710'                     │ '1379560.47 ± 6.72%' │ '1408552.00'        │ 73      │
// └─────────┴───────────────┴────────────────────────────┴───────────────────────────┴──────────────────────┴─────────────────────┴─────────┘
