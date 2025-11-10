import { Bench, nToMs } from '../../src'

const bench = new Bench({
  iterations: 64,
  name: 'simple benchmark bun',
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  now: () => nToMs(Bun.nanoseconds()),
  setup: (_task, mode) => {
    // Run the garbage collector before warmup at each cycle
    if (mode === 'warmup') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      Bun.gc(true)
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
// simple benchmark bun
// ┌───┬─────────────┬──────────────────┬────────────────────┬────────────────────────┬────────────────────────┬─────────┐
// │   │ Task name   │ Latency avg (ns) │ Latency med (ns)   │ Throughput avg (ops/s) │ Throughput med (ops/s) │ Samples │
// ├───┼─────────────┼──────────────────┼────────────────────┼────────────────────────┼────────────────────────┼─────────┤
// │ 0 │ faster task │ 42717 ± 2.33%    │ 38646 ± 6484.00    │ 25736 ± 1.02%          │ 25876 ± 4643           │ 2341    │
// │ 1 │ slower task │ 1443410 ± 10.93% │ 1368739 ± 82721.50 │ 976 ± 35.61%           │ 731 ± 42               │ 72      │
// └───┴─────────────┴──────────────────┴────────────────────┴────────────────────────┴────────────────────────┴─────────┘
