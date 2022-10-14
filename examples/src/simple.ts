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
    'ops/sec': result.hz,
    'Average Time (ps)': result.mean * 1000,
    'Variance (ps)': result.variance * 1000,
    Samples: result.samples.length,
  }) : null)),
);

// Output:
// ┌─────────┬──────────────────┬────────────────────┬─────────────────────┬───────────────────────┬─────────┐
// │ (index) │    Task Name     │      ops/sec       │  Average Time (ps)  │     Variance (ps)     │ Samples │
// ├─────────┼──────────────────┼────────────────────┼─────────────────────┼───────────────────────┼─────────┤
// │    0    │    'switch 1'    │ 14463.371878123484 │ 0.06914017066190119 │ 0.006014460930767669  │ 414836  │
// │    1    │    'switch 2'    │ 14880.867755337544 │ 0.06720038215790977 │ 0.0004529273320957288 │ 458644  │
// │    2    │ 'async switch 1' │  7970.65255150332  │ 0.1254602422497256  │ 0.010617119343817942  │ 367049  │
// │    3    │ 'async switch 2' │ 8702.849913513868  │ 0.11490488862127687 │ 0.002613875857497825  │ 389356  │
// └─────────┴──────────────────┴────────────────────┴─────────────────────┴───────────────────────┴─────────┘
