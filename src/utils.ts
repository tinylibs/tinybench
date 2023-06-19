import type { Fn } from '../types/index';

export const nanoToMs = (nano: number) => nano / 1e6;

export const hrtimeNow = () => nanoToMs(Number(process.hrtime.bigint()));

export const now = () => performance.now();

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
