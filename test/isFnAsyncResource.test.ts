import { expect, test } from 'vitest';
import { isFnAsyncResource } from '../src/utils';

test('isFnAsyncResource undefined', () => {
  // @ts-expect-error: testing with undefined
  expect(isFnAsyncResource(undefined)).toBe(false);
});

test('isFnAsyncResource null', () => {
  // @ts-expect-error: testing with null
  expect(isFnAsyncResource(null)).toBe(false);
});

test('isFnAsyncResource sync', () => {
  expect(isFnAsyncResource(() => 1)).toBe(false);
});

test('isFnAsyncResource async', () => {
  expect(isFnAsyncResource(async () => 1)).toBe(true);
});

test('isFnAsyncResource promise', () => {
  expect(isFnAsyncResource(() => Promise.resolve(1))).toBe(true);
});

test('isFnAsyncResource async promise', () => {
  expect(isFnAsyncResource(async () => Promise.resolve(1))).toBe(true);
});

test('isFnAsyncResource promise with error', () => {
  expect(isFnAsyncResource(() => Promise.reject(new Error('error')))).toBe(
    true,
  );
});

test('isFnAsyncResource async promise with error', () => {
  expect(
    isFnAsyncResource(async () => Promise.reject(new Error('error'))),
  ).toBe(true);
});

test('isFnAsyncResource promiseLike', () => {
  expect(
    isFnAsyncResource(() => ({
      then: () => 1,
    })),
  ).toBe(true);
  expect(isFnAsyncResource(() => ({ then: async () => 1 }))).toBe(true);
  expect(isFnAsyncResource(() => ({ then: () => Promise.resolve(1) }))).toBe(
    true,
  );
  expect(
    isFnAsyncResource(() => ({ then: async () => Promise.resolve(1) })),
  ).toBe(true);
  expect(
    isFnAsyncResource(() => ({
      then: () => Promise.reject(new Error('error')),
    })),
  ).toBe(true);
  expect(
    isFnAsyncResource(() => ({
      then: async () => Promise.reject(new Error('error')),
    })),
  ).toBe(true);
});
