export const now = () => {
  // @ts-ignore
  if (globalThis.process?.hrtime) {
    return nanoToMs(Number(process.hrtime.bigint()));
  }
  return performance.now();
};

export const msToNano = (ms: number) => ms * 1e6;
export const nanoToMs = (nano: number) => nano / 1e6;

/**
 * Computes the arithmetic mean of a sample.
 */
export const getMean = (samples: number[]) =>
  samples.reduce((sum, n) => sum + n, 0) / samples.length || 0;

/**
 * Computes the variance of a sample.
 */
export const getVariance = (samples: number[], mean: number) =>
  samples.reduce((sum, n) => sum + Math.pow(n - mean, 2)) /
    (samples.length - 1) || 0;
