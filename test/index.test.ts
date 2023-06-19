import { test, expect, vi } from 'vitest';
import { Bench, Task } from '../src';

test('basic', async () => {
  const bench = new Bench({ time: 100 });
  bench
    .add('foo', async () => {
      await new Promise((resolve) => setTimeout((resolve), 50));
    })
    .add('bar', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

  await bench.run();

  const tasks = bench.tasks as Task[];

  expect(tasks.length).toEqual(2);

  expect(tasks[0]!.name).toEqual('foo');
  expect(tasks[0]!.result!.totalTime).toBeGreaterThan(50);

  expect(tasks[1]!.name).toEqual('bar');
  expect(tasks[1]!.result!.totalTime).toBeGreaterThan(100);

  // hz is ops/sec, period is ms unit value
  expect(tasks[0]!.result!.hz * tasks[0]!.result!.period).toBeCloseTo(1000);
});

test('runs should be equal-more than time and iterations', async () => {
  const bench = new Bench({ time: 100, iterations: 15 });
  bench.add('foo', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  await bench.run();

  const fooTask = bench.getTask('foo')!;

  expect(fooTask.runs).toBeGreaterThanOrEqual(bench.iterations);
  expect(fooTask.result!.totalTime).toBeGreaterThanOrEqual(bench.time);
});

test('events order', async () => {
  const controller = new AbortController();
  const bench = new Bench({
    signal: controller.signal,
    warmupIterations: 0,
    warmupTime: 0,
  });
  bench
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    .add('foo', async () => {})
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    .add('bar', async () => {})
    .add('error', async () => {
      throw new Error('fake');
    })
    .add('abort', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

  const events: string[] = [];

  const error = bench.getTask('error')!;

  error.addEventListener('start', () => {
    events.push('error-start');
  });

  error.addEventListener('error', () => {
    events.push('error-error');
  });

  error.addEventListener('cycle', () => {
    events.push('error-cycle');
  });

  error.addEventListener('complete', () => {
    events.push('error-complete');
  });

  bench.addEventListener('warmup', () => {
    events.push('warmup');
  });

  bench.addEventListener('start', () => {
    events.push('start');
  });

  bench.addEventListener('error', () => {
    events.push('error');
  });

  bench.addEventListener('reset', () => {
    events.push('reset');
  });

  bench.addEventListener('cycle', (e) => {
    expect(e.task.name).not.toBe('');
    events.push('cycle');
  });

  bench.addEventListener('abort', () => {
    events.push('abort');
  });

  bench.addEventListener('add', () => {
    events.push('add');
  });

  bench.addEventListener('remove', () => {
    events.push('remove');
  });

  bench.addEventListener('complete', () => {
    events.push('complete');
  });

  bench.add('temporary', () => {
    //
  });
  bench.remove('temporary');

  await bench.warmup();

  setTimeout(() => {
    controller.abort();
    // the abort task takes 1000ms (500ms time || 10 iterations => 10 * 1000)
  }, 900);
  await bench.run();
  bench.reset();

  expect(events).toEqual([
    'add',
    'remove',
    'warmup',
    'start',
    'cycle',
    'cycle',
    'error-start',
    'error-error',
    'error',
    'error-cycle',
    'cycle',
    'error-complete',
    'abort',
    'complete',
    'reset',
  ]);

  const abortTask = bench.getTask('abort') as Task;
  // aborted has no results
  expect(abortTask.result).toBeUndefined();
}, 10000);

test('events order 2', async () => {
  const bench = new Bench({
    warmupIterations: 0,
    warmupTime: 0,
  });

  bench
    .add('foo', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    })
    .add('bar', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

  const events: string[] = [];

  const fooTask = bench.getTask('foo')!;
  const barTask = bench.getTask('bar')!;
  fooTask.addEventListener('complete', () => {
    events.push('foo-complete');
    expect(events).not.toContain('bar-complete');
  });

  barTask.addEventListener('complete', () => {
    events.push('bar-complete');
    expect(events).toContain('foo-complete');
  });

  await bench.run();

  await new Promise((resolve) => setTimeout(resolve, 150));
});

test('todo event', async () => {
  const bench = new Bench({ time: 50 });

  let todoTask: Task;
  bench.addEventListener('todo', ({ task }) => {
    todoTask = task;
  });

  bench.todo('unimplemented bench');

  await bench.run();

  expect(todoTask!.name).toBe('unimplemented bench');
});

test('error event', async () => {
  const bench = new Bench({ time: 50 });
  const err = new Error();

  bench.add('error', () => {
    throw err;
  });

  let taskErr: Error;
  bench.addEventListener('error', (e) => {
    const { task } = e;
    taskErr = task.result!.error as Error;
  });

  await bench.run();

  expect(taskErr!).toBe(err);
});

test('detect faster task', async () => {
  const bench = new Bench({ time: 200 });
  bench
    .add('faster', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    })
    .add('slower', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

  await bench.run();

  const fasterTask = bench.getTask('faster') as Task;
  const slowerTask = bench.getTask('slower') as Task;

  expect(fasterTask.result!.mean).toBeLessThan(slowerTask.result!.mean);
  expect(fasterTask.result!.min).toBeLessThan(slowerTask.result!.min);
  expect(fasterTask.result!.max).toBeLessThan(slowerTask.result!.max);

  // moe should be smaller since it's faster
  expect(fasterTask.result!.moe).toBeLessThan(slowerTask.result!.moe);
});

test('statistics', async () => {
  const bench = new Bench({ time: 200 });
  bench.add('foo', async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await bench.run();

  const fooTask = bench.getTask('foo') as Task;

  expect(fooTask.result!.variance).toBeTypeOf('number');
  expect(fooTask.result!.sd).toBeTypeOf('number');
  expect(fooTask.result!.sem).toBeTypeOf('number');
  expect(fooTask.result!.df).toBeTypeOf('number');
  expect(fooTask.result!.critical).toBeTypeOf('number');
  expect(fooTask.result!.moe).toBeTypeOf('number');
  expect(fooTask.result!.rme).toBeTypeOf('number');
});

test('setup and teardown', async () => {
  const setup = vi.fn();
  const teardown = vi.fn();
  const bench = new Bench({ time: 200, setup, teardown });
  bench.add('foo', async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  const fooTask = bench.getTask('foo');

  await bench.warmup();
  await bench.run();

  expect(setup).toBeCalledWith(fooTask, 'warmup');
  expect(setup).toBeCalledWith(fooTask, 'run');
  expect(teardown).toBeCalledWith(fooTask, 'warmup');
  expect(teardown).toBeCalledWith(fooTask, 'run');
});

test('task beforeAll, afterAll, beforeEach, afterEach', async () => {
  const iterations = 100;
  const bench = new Bench({
    time: 0, warmupTime: 0, iterations, warmupIterations: iterations,
  });

  const beforeAll = vi.fn(function hook(this: Task) {
    expect(this).toBe(bench.getTask('foo'));
  });
  const afterAll = vi.fn(function hook(this: Task) {
    expect(this).toBe(bench.getTask('foo'));
  });
  const beforeEach = vi.fn(function hook(this: Task) {
    expect(this).toBe(bench.getTask('foo'));
  });
  const afterEach = vi.fn(function hook(this: Task) {
    expect(this).toBe(bench.getTask('foo'));
  });
  bench.add('foo', async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }, {
    beforeAll,
    afterAll,
    beforeEach,
    afterEach,
  });

  await bench.warmup();
  await bench.run();

  expect(beforeAll.mock.calls.length).toBe(2);
  expect(afterAll.mock.calls.length).toBe(2);
  expect(beforeEach.mock.calls.length).toBe(iterations * 2 /* warmup + run */);
  expect(afterEach.mock.calls.length).toBe(iterations * 2);
  expect(beforeEach.mock.calls.length).toBe(afterEach.mock.calls.length);
});
