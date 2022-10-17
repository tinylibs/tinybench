import { Bench } from '../../src';

const bench = new Bench({ time: 100 });

bench
  .add('switch 1', () => {
    let a = 1;
    let b = 2;
    const c = a;
    a = b;
    b = c;
  })
  .add('switch 2', () => {
    let a = 1;
    let b = 10;
    a = b + a;
    b = a - b;
    a = b - a;
  })
  .add('async switch 1', async () => {
    let a = 1;
    let b = 2;
    const c = a;
    a = b;
    b = c;
  })
  .add('async switch 2', async () => {
    let a = 1;
    let b = 10;
    a = b + a;
    b = a - b;
    a = b - a;
  });

await bench.run();

console.table(
  bench.tasks.map(({ name, result }) => (result ? ({
    'Task Name': name,
    'ops/sec': parseInt(result.hz, 10).toLocaleString(),
    'Average Time (ns)': result.mean * 1000 * 1000,
    Margin: `\xb1${result.rme.toFixed(2)}%`,
    Samples: result.samples.length,
  }) : null)),
);

// Output:
// ┌─────────┬──────────────────┬──────────────┬────────────────────┬──────────┬─────────┐
// │ (index) │    Task Name     │   ops/sec    │ Average Time (ns)  │  Margin  │ Samples │
// ├─────────┼──────────────────┼──────────────┼────────────────────┼──────────┼─────────┤
// │    0    │    'switch 1'    │ '15,370,548' │ 65.05948714494949  │ '±1.89%' │ 1537055 │
// │    1    │    'switch 2'    │ '14,826,005' │ 67.44905232421046  │ '±2.69%' │ 1482601 │
// │    2    │ 'async switch 1' │ '8,196,259'  │ 122.00687003709369 │ '±5.01%' │ 819626  │
// │    3    │ 'async switch 2' │ '7,830,281'  │ 127.7093250277111  │ '±5.79%' │ 788521  │
// └─────────┴──────────────────┴──────────────┴────────────────────┴──────────┴─────────┘
