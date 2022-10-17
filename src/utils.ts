import type { Fn } from 'types/index';

export const nanoToMs = (nano: number) => nano / 1e6;

export const now = () => {
  if (typeof globalThis.process?.hrtime === 'function') {
    return nanoToMs(Number(process.hrtime.bigint()));
  }
  return performance.now();
};

/**
 * Computes the arithmetic mean of a sample.
 */
export const getMean = (samples: number[]) => samples.reduce((sum, n) => sum + n, 0) / samples.length || 0;

/**
 * Computes the variance of a sample.
 */
export const getVariance = (samples: number[], mean: number) => {
  const result = samples.reduce((sum, n) => sum + ((n - mean) ** 2));
  return result / (samples.length - 1) || 0;
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
const AsyncFunctionConstructor = (async () => {}).constructor;

/**
 * an async function check method only consider runtime support async syntax
 */
export const isAsyncFunction = (fn: Fn) => fn.constructor === AsyncFunctionConstructor;

/**
 * an async function check method consider runtime not support async syntax
 */
export const isAsyncFunctionDirty = (fn: Fn) => {
  try {
    const ret = fn();
    return !!ret && typeof ret === 'object' && typeof ret.then === 'function';
  } catch {
    // if fn throw error directly, consider it's a sync function
    return false;
  }
};
