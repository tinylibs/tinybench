/* eslint-disable no-console */
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
// ┌─────────┬───────────────┬──────────┬────────────────────┬───────────┬─────────┐
// │ (index) │   Task Name   │ ops/sec  │ Average Time (ns)  │  Margin   │ Samples │
// ├─────────┼───────────────┼──────────┼────────────────────┼───────────┼─────────┤
// │    0    │ 'faster task' │ '41,621' │ 24025.791819761525 │ '±20.50%' │  4257   │
// │    1    │ 'slower task' │  '828'   │ 1207382.7838323202 │ '±7.07%'  │   83    │
// └─────────┴───────────────┴──────────┴────────────────────┴───────────┴─────────┘

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
