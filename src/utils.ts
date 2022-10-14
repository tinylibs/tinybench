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

/**
 * Computes the sum of a sample
 */
export const getSum = (samples: number[]) => samples.reduce((sum, n) => sum + n, 0);
