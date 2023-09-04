import type { Fn } from '../types/index';
import type Task from './task';

export const nanoToMs = (nano: number) => nano / 1e6;

export const hrtimeNow = () => nanoToMs(Number(process.hrtime.bigint()));

export const now = () => performance.now();

function isPromiseLike<T>(maybePromiseLike: any): maybePromiseLike is PromiseLike<T> {
  return (
    maybePromiseLike !== null
    && typeof maybePromiseLike === 'object'
    && typeof maybePromiseLike.then === 'function'
  );
}

/**
 * Computes the arithmetic mean of a sample.
 */
export const getMean = (samples: number[]) => samples.reduce((sum, n) => sum + n, 0) / samples.length || 0;

/**
 * Computes the variance of a sample.
 */
export const getVariance = (samples: number[], mean: number) => {
  const result = samples.reduce((sum, n) => sum + ((n - mean) ** 2), 0);
  return result / (samples.length - 1) || 0;
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
const AsyncFunctionConstructor = (async () => {}).constructor;

/**
 * an async function check method only consider runtime support async syntax
 */
export const isAsyncFunction = (fn: Fn) => fn.constructor === AsyncFunctionConstructor;

export const isAsyncTask = async (task: Task) => {
  if (isAsyncFunction(task.fn)) {
    return true;
  }
  try {
    if (task.opts.beforeEach != null) {
      await task.opts.beforeEach.call(task);
    }
    const call = task.fn();
    const promiseLike = isPromiseLike(call);
    if (promiseLike) {
      try {
        await call;
      } catch (e) {
        // ignore
      }
    }
    if (task.opts.afterEach != null) {
      await task.opts.afterEach.call(task);
    }
    return promiseLike;
  } catch (e) {
    return false;
  }
};
