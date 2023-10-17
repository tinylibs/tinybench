import { test, expect } from 'vitest';
import { Bench, Task } from '../src';
import { isAsyncTask } from '../src/utils';

const bench = new Bench();

test('isAsyncTask sync', () => {
  const task = new Task(bench, 'foo', () => 1);
  expect(isAsyncTask(task)).resolves.toBe(false);
});

test('isAsyncTask async', () => {
  const task = new Task(bench, 'foo', async () => 1);
  expect(isAsyncTask(task)).resolves.toBe(true);
});

test('isAsyncTask promise', () => {
  const task = new Task(bench, 'foo', () => Promise.resolve(1));
  expect(isAsyncTask(task)).resolves.toBe(true);
});

test('isAsyncTask promiseLike', () => {
  const task = new Task(bench, 'foo', () => ({
    then: (resolve: () => void) => setTimeout(resolve, 100),
  }));
  expect(isAsyncTask(task)).resolves.toBe(true);
});

test('isAsyncTask promise with catch', () => {
  const task = new Task(bench, 'foo', () => Promise.reject(new Error('foo')));
  expect(isAsyncTask(task)).resolves.toBe(true);
});

test('isAsyncTask beforeEach with error', () => {
  const task = new Task(bench, 'foo', async () => 1, {
    beforeEach: () => { throw new Error('foo'); },
  });
  expect(isAsyncTask(task)).resolves.toBe(true);
});

test('isAsyncTask beforeEach with promise error', () => {
  const task = new Task(bench, 'foo', async () => 1, {
    beforeEach: () => Promise.reject(new Error('foo')),
  });
  expect(isAsyncTask(task)).resolves.toBe(true);
});

test('isAsyncTask afterEach with error', () => {
  const task = new Task(bench, 'foo', async () => 1, {
    afterEach: () => { throw new Error('foo'); },
  });
  expect(isAsyncTask(task)).resolves.toBe(true);
});

test('isAsyncTask afterEach with promise error', () => {
  const task = new Task(bench, 'foo', async () => 1, {
    afterEach: () => Promise.reject(new Error('foo')),
  });
  expect(isAsyncTask(task)).resolves.toBe(true);
});

test('isAsyncTask beforeAll with error', () => {
  const task = new Task(bench, 'foo', async () => 1, {
    beforeAll: () => { throw new Error('foo'); },
  });
  expect(isAsyncTask(task)).resolves.toBe(true);
});

test('isAsyncTask beforeAll with promise error', () => {
  const task = new Task(bench, 'foo', async () => 1, {
    beforeAll: () => Promise.reject(new Error('foo')),
  });
  expect(isAsyncTask(task)).resolves.toBe(true);
});

test('isAsyncTask afterAll with error', () => {
  const task = new Task(bench, 'foo', async () => 1, {
    afterAll: () => { throw new Error('foo'); },
  });
  expect(isAsyncTask(task)).resolves.toBe(true);
});

test('isAsyncTask afterAll with promise error', () => {
  const task = new Task(bench, 'foo', async () => 1, {
    afterAll: () => Promise.reject(new Error('foo')),
  });
  expect(isAsyncTask(task)).resolves.toBe(true);
});
