import { Bench } from '../../src'

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
