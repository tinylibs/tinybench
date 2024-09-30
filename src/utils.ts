import type { Fn } from './types';
import type Task from './task';

export const nanoToMs = (nano: number) => nano / 1e6;

export const hrtimeNow = () => nanoToMs(Number(process.hrtime.bigint()));

export const now = () => performance.now();

export const quantileSorted = (arr: number[], q: number) => {
  if (arr.length === 0) {
    throw new Error('arr must not be empty');
  }
  if (q < 0 || q > 1) {
    throw new Error('q must be between 0 and 1');
  }
  if (q === 0) {
    return arr[0];
  }
  if (q === 1) {
    return arr[arr.length - 1];
  }
  const base = (arr.length - 1) * q;
  const baseIndex = Math.floor(base);
  if (arr[baseIndex + 1] != null) {
    return (
      // @ts-expect-error: array cannot be empty
      (arr[baseIndex])
      // @ts-expect-error: false positive
      + (base - baseIndex) * ((arr[baseIndex + 1]) - arr[baseIndex])
    );
  }
  return arr[baseIndex];
};

function isPromiseLike<T>(maybePromiseLike: any): maybePromiseLike is PromiseLike<T> {
  return (
    maybePromiseLike !== null
    && typeof maybePromiseLike === 'object'
    && typeof maybePromiseLike.then === 'function'
  );
}

/**
 * Computes the variance of a sample with Bessel's correction.
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
      try {
        await task.opts.beforeEach.call(task);
      } catch (e) {
        // ignore
      }
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
      try {
        await task.opts.afterEach.call(task);
      } catch (e) {
        // ignore
      }
    }
    return promiseLike;
  } catch (e) {
    return false;
  }
};
