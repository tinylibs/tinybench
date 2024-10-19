import { tTable } from './constants';
import type { Fn, Statistics } from './types';

export const nanoToMs = (nano: number) => nano / 1e6;

export const hrtimeNow = () => nanoToMs(Number(process.hrtime.bigint()));

export const now = () => performance.now();

/**
 * Checks if a value is a promise-like object.
 *
 * @param maybePromiseLike - the value to check
 * @returns true if the value is a promise-like object
 */
const isPromiseLike = <T>(
  maybePromiseLike: unknown,
): maybePromiseLike is PromiseLike<T> => maybePromiseLike !== null
  && typeof maybePromiseLike === 'object'
  && typeof (maybePromiseLike as PromiseLike<T>).then === 'function';

type AsyncFunctionType<A extends unknown[], R> = (...args: A) => PromiseLike<R>;

/**
 * An async function check helper only considering runtime support async syntax
 *
 * @param fn - the function to check
 * @returns true if the function is an async function
 */
const isAsyncFunction = (
  fn: Fn,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
): fn is AsyncFunctionType<unknown[], unknown> => fn?.constructor === (async () => {}).constructor;

/**
 * An async function check helper considering runtime support async syntax and promise return
 *
 * @param fn - the function to check
 * @returns true if the function is an async function or returns a promise
 */
export const isFnAsyncResource = (fn: Fn): boolean => {
  if (fn == null) {
    return false;
  }
  if (isAsyncFunction(fn)) {
    return true;
  }
  try {
    const fnCall = fn();
    const promiseLike = isPromiseLike(fnCall);
    if (promiseLike) {
      // silence promise rejection
      try {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        (fnCall as Promise<unknown>).then(() => {})?.catch(() => {});
      } catch {
        // ignore
      }
    }
    return promiseLike;
  } catch {
    return false;
  }
};

/**
 * Computes the average of a sample.
 *
 * @param samples the sample
 * @returns the average of the sample
 * @throws if the sample is empty
 */
const average = (samples: number[]) => {
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
const variance = (samples: number[], avg = average(samples)) => {
  const result = samples.reduce((sum, n) => sum + (n - avg) ** 2, 0);
  return result / (samples.length - 1) || 0;
};

/**
 * Computes the q-quantile of a sorted sample.
 *
 * @param samples the sorted sample
 * @param q the quantile to compute
 * @returns the q-quantile of the sample
 * @throws if the sample is empty
 */
const quantileSorted = (samples: number[], q: number) => {
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
const medianSorted = (samples: number[]) => quantileSorted(samples, 0.5);

/**
 * Computes the absolute deviation of a sample given an aggregation.
 *
 * @param samples the sample
 * @param aggFn the aggregation function to use
 * @returns the absolute deviation of the sample given the aggregation
 */
const absoluteDeviation = (
  samples: number[],
  aggFn: (arr: number[]) => number | undefined,
  aggValue?: number,
) => {
  const value = aggValue ?? aggFn(samples);
  const absoluteDeviations: number[] = [];

  for (const sample of samples) {
    absoluteDeviations.push(Math.abs(sample - value!));
  }

  return aggFn(absoluteDeviations);
};

/**
 * Computes the statistics of a sample.
 * The sample must be sorted.
 *
 * @param samples the sorted sample
 * @returns the statistics of the sample
 * @throws if the sample is empty
 */
export const getStatisticsSorted = (samples: number[]): Statistics => {
  const mean = average(samples);
  const vr = variance(samples, mean);
  const sd = Math.sqrt(vr);
  const sem = sd / Math.sqrt(samples.length);
  const df = samples.length - 1;
  const critical = tTable[(Math.round(df) || 1).toString()] || tTable.infinity!;
  const moe = sem * critical;
  const rme = (moe / mean) * 100;
  const p50 = medianSorted(samples);
  return {
    samples,
    min: samples[0]!,
    max: samples[df]!,
    mean,
    variance: vr,
    sd,
    sem,
    df,
    critical,
    moe,
    rme,
    aad: absoluteDeviation(samples, average, mean),
    mad: absoluteDeviation(samples, medianSorted, p50),
    p50,
    p75: quantileSorted(samples, 0.75),
    p99: quantileSorted(samples, 0.99),
    p995: quantileSorted(samples, 0.995),
    p999: quantileSorted(samples, 0.999),
  };
};
