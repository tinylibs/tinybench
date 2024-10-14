import type Task from './task';
import type { Fn } from './types';

export const nanoToMs = (nano: number) => nano / 1e6;

export const hrtimeNow = () => nanoToMs(Number(process.hrtime.bigint()));

export const now = () => performance.now();

function isPromiseLike<T>(
  maybePromiseLike: any,
): maybePromiseLike is PromiseLike<T> {
  return (
    maybePromiseLike !== null
    && typeof maybePromiseLike === 'object'
    && typeof maybePromiseLike.then === 'function'
  );
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const AsyncFunctionConstructor = (async () => {}).constructor;

/**
 * An async function check method only consider runtime support async syntax
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

/**
 * Computes the average of a sample.
 *
 * @param samples the sample
 * @returns the average of the sample
 */
export const average = (samples: number[]) => {
  if (samples.length === 0) {
    throw new Error('samples must not be empty');
  }

  return samples.reduce((a, b) => a + b, 0) / samples.length || 0;
};

/**
 * Computes the variance of a sample with Bessel's correction.
 *
 * @param samples the sample
 * @param avg the average of the sample
 * @returns the variance of the sample
 */
export const variance = (samples: number[], avg = average(samples)) => {
  const result = samples.reduce((sum, n) => sum + (n - avg) ** 2, 0);
  return result / (samples.length - 1) || 0;
};

/**
 * Computes the q-quantile of a sorted sample.
 *
 * @param samples the sorted sample
 * @param q the quantile to compute
 * @returns the q-quantile of the sample
 */
export const quantileSorted = (samples: number[], q: number) => {
  if (samples.length === 0) {
    throw new Error('samples must not be empty');
  }
  if (q < 0 || q > 1) {
    throw new Error('q must be between 0 and 1');
  }
  if (q === 0) {
    return samples[0];
  }
  if (q === 1) {
    return samples[samples.length - 1];
  }
  const base = (samples.length - 1) * q;
  const baseIndex = Math.floor(base);
  if (samples[baseIndex + 1] != null) {
    return (
      samples[baseIndex]!
      + (base - baseIndex) * (samples[baseIndex + 1]! - samples[baseIndex]!)
    );
  }
  return samples[baseIndex];
};

/**
 * Computes the median of a sorted sample.
 *
 * @param samples the sorted sample
 * @returns the median of the sample
 */
export const medianSorted = (samples: number[]) => quantileSorted(samples, 0.5);

/**
 * Computes the absolute deviation of a sample given an aggregation.
 *
 * @param samples the sample
 * @param aggFn the aggregation function to use
 * @returns the absolute deviation of the sample given the aggregation
 */
export const absoluteDeviation = (
  samples: number[],
  aggFn: (arr: number[]) => number | undefined,
) => {
  const value = aggFn(samples);
  const absoluteDeviations: number[] = [];

  for (const sample of samples) {
    absoluteDeviations.push(Math.abs(sample - value!));
  }

  return aggFn(absoluteDeviations);
};
