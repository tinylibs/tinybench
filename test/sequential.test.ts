import { setTimeout } from 'node:timers/promises';
import { expect, test } from 'vitest';
import { Bench } from '../src';

test('sequential', async () => {
  const sequentialBench = new Bench({
    time: 0,
    iterations: 100,
  });

  let isFirstTaskDefined;
  sequentialBench
    .add('sample 1', async () => {
      await setTimeout(0);
      for (let i = 0; i < 1e7; i++);
    })
    .add('sample 2', async () => {
      // sample 1 should be defined always
      if (sequentialBench.tasks[0]?.result === undefined) {
        isFirstTaskDefined = false;
      } else {
        isFirstTaskDefined = true;
      }

      await setTimeout(0);
      for (let i = 0; i < 1e7; i++);
    });

  await sequentialBench.warmup();
  await sequentialBench.run();
  expect(isFirstTaskDefined).toBe(true);
});

test.each(['warmup', 'run'])('%s bench concurrency', async (mode) => {
  const concurrentBench = new Bench({
    time: 0,
    iterations: 100,
    throws: true,
  });
  expect(concurrentBench.threshold).toBe(Number.POSITIVE_INFINITY);
  expect(concurrentBench.concurrency).toBeNull();
  concurrentBench.concurrency = 'bench';
  expect(concurrentBench.concurrency).toBe('bench');

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
    // not awaited on purpose
    concurrentBench.warmup();
  } else if (mode === 'run') {
    // not awaited on purpose
    concurrentBench.run();
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

test.each(['warmup', 'run'])('%s task concurrency', async (mode) => {
  const iterations = 10;
  const concurrentBench = new Bench({
    time: 0,
    warmupTime: 0,
    iterations,
    warmupIterations: iterations,
  });
  expect(concurrentBench.threshold).toBe(Number.POSITIVE_INFINITY);
  expect(concurrentBench.concurrency).toBeNull();

  const key = 'sample 1';
  let runs = 0;

  concurrentBench.add(key, async () => {
    runs++;
    await setTimeout(10);
    // all task function should be here after 10ms
    expect(runs).toEqual(iterations);
    await setTimeout(10);
  });

  if (mode === 'warmup') {
    await concurrentBench.warmup();
  } else if (mode === 'run') {
    await concurrentBench.run();
    for (const result of concurrentBench.results) {
      expect(result?.error).toMatchObject(/AssertionError/);
    }
  }
  expect(concurrentBench.getTask(key)!.runs).toEqual(0);
  expect(runs).toEqual(1);
  concurrentBench.reset();
  runs = 0;
  expect(concurrentBench.threshold).toBe(Number.POSITIVE_INFINITY);
  expect(concurrentBench.concurrency).toBeNull();

  concurrentBench.concurrency = 'task';
  expect(concurrentBench.threshold).toBe(Number.POSITIVE_INFINITY);
  expect(concurrentBench.concurrency).toBe('task');

  if (mode === 'warmup') {
    await concurrentBench.warmup();
  } else if (mode === 'run') {
    await concurrentBench.run();
    for (const result of concurrentBench.results) {
      expect(result?.error).toBeUndefined();
    }
    expect(concurrentBench.getTask(key)!.runs).toEqual(10);
  }
  expect(runs).toEqual(10);
});
