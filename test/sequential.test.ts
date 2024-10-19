import { randomInt } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { expect, test } from 'vitest';
import { Bench } from '../src';

test('sequential', async () => {
  const sequentialBench = new Bench({
    time: 0,
    iterations: 100,
  });

  const benchTasks: string[] = [];
  sequentialBench
    .add('sample 1', async () => {
      await setTimeout(randomInt(0, 100));
      benchTasks.push('sample 1');
      expect(benchTasks).toStrictEqual(['sample 1']);
      await setTimeout(randomInt(0, 100));
    })
    .add('sample 2', async () => {
      await setTimeout(randomInt(0, 100));
      benchTasks.push('sample 2');
      expect(benchTasks).toStrictEqual(['sample 1', 'sample 2']);
      await setTimeout(randomInt(0, 100));
    })
    .add('sample 3', async () => {
      await setTimeout(randomInt(0, 100));
      benchTasks.push('sample 3');
      expect(benchTasks).toStrictEqual(['sample 1', 'sample 2', 'sample 3']);
      await setTimeout(randomInt(0, 100));
    });

  await sequentialBench.warmup();
  const tasks = await sequentialBench.run();

  expect(tasks.length).toBe(3);
  expect(benchTasks.length).toBeGreaterThanOrEqual(tasks.length);
  expect(tasks[0]?.name).toBe('sample 1');
  expect(tasks[1]?.name).toBe('sample 2');
  expect(tasks[2]?.name).toBe('sample 3');
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

  let shouldBeDefined1: true | undefined;
  let shouldBeDefined2: true | undefined;

  let shouldNotBeDefinedFirst1: true | undefined;
  let shouldNotBeDefinedFirst2: true | undefined;
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
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    concurrentBench.warmup();
  } else if (mode === 'run') {
    // not awaited on purpose
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    concurrentBench.run();
  }

  await setTimeout(0);
  expect(shouldBeDefined1).toBeDefined();
  expect(shouldBeDefined2).toBeDefined();
  expect(shouldNotBeDefinedFirst1).toBeUndefined();
  expect(shouldNotBeDefinedFirst2).toBeUndefined();
  await setTimeout(100);
  expect(shouldNotBeDefinedFirst1).toBeDefined();
  expect(shouldNotBeDefinedFirst2).toBeDefined();
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

  const taskName = 'sample 1';
  let runs = 0;

  concurrentBench.add(taskName, async () => {
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
  expect(concurrentBench.getTask(taskName)?.runs).toEqual(0);
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
    expect(concurrentBench.getTask(taskName)?.runs).toEqual(10);
  }
  expect(runs).toEqual(10);
});
