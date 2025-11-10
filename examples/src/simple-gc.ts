import { Bench } from '../../src'

const bench = new Bench({
  iterations: 64,
  name: 'simple benchmark gc',
  setup: (_task, mode) => {
    // Run the garbage collector before warmup at each cycle
    if (mode === 'warmup' && typeof globalThis.gc === 'function') {
      globalThis.gc()
    }
  },
  time: 100
})

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
// simple benchmark gc
// ┌─────────┬───────────────┬───────────────────┬───────────────────────┬────────────────────────┬────────────────────────┬─────────┐
// │ (index) │ Task name     │ Latency avg (ns)  │ Latency med (ns)      │ Throughput avg (ops/s) │ Throughput med (ops/s) │ Samples │
// ├─────────┼───────────────┼───────────────────┼───────────────────────┼────────────────────────┼────────────────────────┼─────────┤
// │ 0       │ 'faster task' │ '51687 ± 3.07%'   │ '53147 ± 17317.50'    │ '22478 ± 1.46%'        │ '18816 ± 5605'         │ 1936    │
// │ 1       │ 'slower task' │ '1605805 ± 7.06%' │ '1713970 ± 121077.00' │ '793 ± 20.79%'         │ '583 ± 39'             │ 64      │
// └─────────┴───────────────┴───────────────────┴───────────────────────┴────────────────────────┴────────────────────────┴─────────┘
