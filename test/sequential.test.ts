import { setTimeout } from 'timers/promises';
import { test, expect } from 'vitest';
import { Bench } from '../src';

test('sequential', async () => {
  const bench = new Bench({
    time: 0,
    iterations: 100,
  });

  let isFirstTaskDefined = true;
  bench
    .add('sample 1', async () => {
      await setTimeout(0);
      for (let i = 0; i < 1e7; i++);
    })
    .add('sample 2', async () => {
      if (typeof bench.tasks[0]?.result === 'undefined') isFirstTaskDefined = false;

      await setTimeout(0);
      for (let i = 0; i < 1e7; i++);
    });

  await bench.warmup();
  await bench.run();
  // first task should be undefined sometimes because of concurrency
  expect(isFirstTaskDefined).toBe(false);

  const sequentialBench = new Bench({
    time: 0,
    iterations: 100,
  });

  isFirstTaskDefined = false;
  sequentialBench
    .add('sample 1', async () => {
      await setTimeout(0);
      for (let i = 0; i < 1e7; i++);
    })
    .add('sample 2', async () => {
      // sample 1 should be defined always
      if (typeof sequentialBench.tasks[0]?.result === 'undefined') isFirstTaskDefined = false;
      else isFirstTaskDefined = true;

      await setTimeout(0);
      for (let i = 0; i < 1e7; i++);
    });

  await sequentialBench.warmup();
  await sequentialBench.runSequentially();
  expect(isFirstTaskDefined).toBe(true);

  expect(sequentialBench.tasks[0]!.result!.mean).toBeLessThan(
    bench.tasks[0]!.result!.mean,
  );
  expect(sequentialBench.tasks[1]!.result!.mean).toBeLessThan(
    bench.tasks[1]!.result!.mean,
  );
});
