import { setTimeout } from 'node:timers/promises';
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

test.each(['warmup', 'run'])('%s concurrent (bench level)', async (mode) => {
  const concurrentBench = new Bench({
    time: 0,
    iterations: 100,
    throws: true,
  });

  let shouldBeDefined1: true;
  let shouldBeDefined2: true;

  let shouldNotBeDefinedFirst1: true;
  let shouldNotBeDefinedFirst2: true;
  concurrentBench
    .add('sample 1', async () => {
      shouldBeDefined1 = true;
      await setTimeout(100);
      shouldNotBeDefinedFirst1 = true;
    })
    .add('sample 2', async () => {
      shouldBeDefined2 = true;
      await setTimeout(100);
      shouldNotBeDefinedFirst2 = true;
    });

  if (mode === 'warmup') {
    concurrentBench.warmupConcurrently();
  } else {
    concurrentBench.runConcurrently();
  }

  await setTimeout(0);
  expect(shouldBeDefined1!).toBeDefined();
  expect(shouldBeDefined2!).toBeDefined();
  expect(shouldNotBeDefinedFirst1!).toBeUndefined();
  expect(shouldNotBeDefinedFirst2!).toBeUndefined();
  await setTimeout(100);
  expect(shouldNotBeDefinedFirst1!).toBeDefined();
  expect(shouldNotBeDefinedFirst2!).toBeDefined();
});

test.each(['warmup', 'run'])('%s concurrent (task level)', async (mode) => {
  const iterations = 10;
  const concurrentBench = new Bench({
    time: 0,
    warmupTime: 0,
    iterations,
    warmupIterations: iterations,
  });
  const key = 'sample 1';

  const runs = { value: 0 };
  concurrentBench
    .add(key, async () => {
      runs.value++;
      await setTimeout(10);
      // all task function should be here after 10ms
      expect(runs.value).toEqual(iterations);
      await setTimeout(10);
    });

  if (mode === 'warmup') {
    await concurrentBench.warmup();
  } else {
    await concurrentBench.run();
    for (const result of concurrentBench.results) {
      expect(result?.error).toMatch(/AssertionError/);
    }
  }
  expect(concurrentBench.getTask(key)!.runs).toEqual(0);

  concurrentBench.reset();
  runs.value = 0;

  if (mode === 'warmup') {
    await concurrentBench.warmupConcurrently();
  } else {
    await concurrentBench.runConcurrently();
    for (const result of concurrentBench.results) {
      expect(result?.error).toMatch(/AssertionError/);
    }
  }
  expect(concurrentBench.getTask(key)!.runs).toEqual(0);
  concurrentBench.reset();
  runs.value = 0;

  if (mode === 'warmup') {
    await concurrentBench.warmupConcurrently(Infinity, 'task');
    expect(runs.value).toEqual(10);
  } else {
    await concurrentBench.runConcurrently(Infinity, 'task');

    for (const result of concurrentBench.results) {
      expect(result?.error).toBeUndefined();
    }
    expect(runs.value).toEqual(10);
    expect(concurrentBench.getTask(key)!.runs).toEqual(10);
  }
});
