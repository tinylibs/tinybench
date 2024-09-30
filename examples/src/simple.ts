import { Bench } from '../../src';

const bench = new Bench({ time: 100 });

bench
  .add('faster task', () => {
    console.log('I am faster');
  })
  .add('slower task', async () => {
    await new Promise((r) => setTimeout(r, 1)); // we wait 1ms :)
    console.log('I am slower');
  })
  .todo('unimplemented bench');

await bench.run();

console.table(bench.table());

// Output:
// ┌─────────┬───────────────┬──────────┬──────────────────────┬──────────┬──────────────────────────────────┬─────────┐
// │ (index) │ Task name     │ ops/sec  │ Average time/op (ns) │ Margin   │ Median time/op (ns)              │ Samples │
// ├─────────┼───────────────┼──────────┼──────────────────────┼──────────┼──────────────────────────────────┼─────────┤
// │ 0       │ 'faster task' │ '38,832' │ 25751.297631307978   │ '±3.48%' │ '22016.49999997812±5.5000000145' │ 3884    │
// │ 1       │ 'slower task' │ '669'    │ 1493338.567164177    │ '±5.98%' │ '1445076.0000000286'             │ 67      │
// └─────────┴───────────────┴──────────┴──────────────────────┴──────────┴──────────────────────────────────┴─────────┘

console.table(
  bench.todos.map(({ name }) => ({
    'Task name': name,
  })),
);

// Output:
// ┌─────────┬───────────────────────┐
// │ (index) │       Task name       │
// ├─────────┼───────────────────────┤
// │    0    │ 'unimplemented bench' │
// └─────────┴───────────────────────┘
