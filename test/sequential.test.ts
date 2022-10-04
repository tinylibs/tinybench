import { setTimeout } from 'timers/promises';
import { test, expect } from 'vitest';
import { Bench } from '../src';

test('sequential', async () => {
  let isFirstTaskDefined = true;

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
      if (typeof sequentialBench.tasks[0]?.result === 'undefined') { isFirstTaskDefined = false; } else isFirstTaskDefined = true;

      await setTimeout(0);
      for (let i = 0; i < 1e7; i++);
    });

  await sequentialBench.warmup();
  await sequentialBench.run();
  expect(isFirstTaskDefined).toBe(true);
});
