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
export function getMean(samples: number[]) {
  if (samples.length === 0) {
    return 0;
  }

  let result = 0;

  for (let i = 0, il = samples.length; i < il; ++i) {
    result += samples[i]!;
  }
  return result / samples.length;
}

/**
 * Computes the variance of a sample.
 */
export function getVariance(samples: number[], mean: number) {
  if (samples.length === 0) {
    return 0;
  }
  let result = 0;

  for (let i = 0, il = samples.length; i < il; ++i) {
    result += Math.pow(samples[i]! - mean, 2);
  }
  return result / samples.length - 1;
}
