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

test('concurrent (bench level)', async () => {
  const concurrentBench = new Bench({
    time: 0,
    iterations: 100,
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

  concurrentBench.runConcurrently();
  await setTimeout(0);
  expect(shouldBeDefined1!).toBeDefined();
  expect(shouldBeDefined2!).toBeDefined();
  expect(shouldNotBeDefinedFirst1!).toBeUndefined();
  expect(shouldNotBeDefinedFirst2!).toBeUndefined();
  await setTimeout(100);
  expect(shouldNotBeDefinedFirst1!).toBeDefined();
  expect(shouldNotBeDefinedFirst2!).toBeDefined();
});

test('concurrent (task level)', async () => {
  console.log('here start');
  const iterations = 10;
  const concurrentBench = new Bench({
    time: 0,
    iterations,
  });
  const key = 'sample 1';

  const runs = { value: 0 };
  concurrentBench
    .add(key, async () => {
      runs.value++;
      await setTimeout(10);
      // all task function should be here after 10ms
      console.log(runs.value, iterations);
      expect(runs.value).toEqual(iterations);
      await setTimeout(10);
    });

  await concurrentBench.run();
  expect(concurrentBench.getTask(key)!.runs).toEqual(0);
  for (const result of concurrentBench.results) {
    expect(result?.error).toMatch(/AssertionError/);
  }
  concurrentBench.reset();
  runs.value = 0;

  await concurrentBench.runConcurrently();
  expect(concurrentBench.getTask(key)!.runs).toEqual(0);
  for (const result of concurrentBench.results) {
    expect(result?.error).toMatch(/AssertionError/);
  }
  concurrentBench.reset();
  runs.value = 0;

  await concurrentBench.runConcurrently(Infinity, 'task');
  expect(concurrentBench.getTask(key)!.runs).toEqual(10);
  for (const result of concurrentBench.results) {
    expect(result?.error).toBeUndefined();
  }
});
