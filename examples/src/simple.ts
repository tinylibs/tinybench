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
  });

await bench.run();

console.table(bench.results.map((result) => ({ "Task Name": result?.taskName, "Average Time (ps)": result?.mean! * 1000, "Variance (ps)": result?.variance! * 1000 })));

// Output:
// ┌─────────┬────────────┬────────────────────┬────────────────────┐
// │ (index) │ Task Name  │ Average Time (ps)  │   Variance (ps)    │
// ├─────────┼────────────┼────────────────────┼────────────────────┤
// │    0    │ 'switch 1' │ 1.8458325710527104 │ 1.2113875253341617 │
// │    1    │ 'switch 2' │ 1.8746935152109603 │ 1.2254725890767446 │
// └─────────┴────────────┴────────────────────┴────────────────────┘
