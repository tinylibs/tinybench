import { expect, test } from 'vitest'

import { computeStatistics } from '../src/utils'
import { toSortedSamples } from './utils'

/**
 * Asserts that a critical value is close to its 50-digit reference value.
 *
 * These references are the same ones `student-t.test.ts` checks to within 100
 * ULP, so this file checks the wiring of `computeStatistics` rather than the
 * arithmetic. The tolerance is loose enough to survive the engine-dependent
 * last bits of `Math.log`, `Math.log1p` and `Math.exp`: those differ by up to
 * 81 ULP between the Node, Bun and Deno versions in the CI matrix, which is
 * 1.7e-14 relative, so a 1e-13 bound would be within a factor of six of
 * flaking. It is still far tighter than the regression it has to catch: the
 * removed table was off by 1.2e-3 at the largest degrees of freedom used here
 * and by 9.8e-10 at df=5.
 * @param actual - the value produced by `computeStatistics`
 * @param expected - the reference value, correct to the last bit
 * @param label - the assertion label
 */
function expectClose (
  actual: number,
  expected: number,
  label: string
): void {
  expect(
    Math.abs(actual - expected),
    label
  ).toBeLessThanOrEqual(expected * 1e-12)
}

test('computeStatistics', () => {
  let stats = computeStatistics(toSortedSamples([1, 2, 3, 4, 5, 6]))
  expect(stats.min, 'min').toBe(1)
  expect(stats.max, 'max').toBe(6)
  expect(stats.df, 'df').toBe(5)
  expectClose(stats.critical, 2.5705818356363155, 'critical')
  expect(stats.mean, 'mean').toBe(3.5)
  expect(stats.variance, 'variance').toBe(3.5)
  expect(stats.sd, 'sd').toBe(1.8708286933869707)
  expect(stats.sem, 'sem').toBe(0.7637626158259734)
  // The formula, exactly, and the magnitude, which `stats.sem * stats.critical`
  // alone would not pin. `moe` inherits the few ULP of `critical`, hence the
  // tolerance here is on the product rather than an equality.
  expect(stats.moe, 'moe').toBe(stats.sem * stats.critical)
  expectClose(stats.moe, 1.9633143069803247, 'moe magnitude')
  expect(stats.rme, 'rme').toBe((stats.moe / stats.mean) * 100)
  expect(stats.p50, 'p50').toBe(3.5)
  expect(stats.p75, 'p75').toBe(4.75)
  expect(stats.p99, 'p99').toBe(5.95)
  expect(stats.p995, 'p995').toBe(5.975)
  expect(stats.p999, 'p999').toBe(5.995)
  expect(stats.mad, 'mad').toBe(1.5)
  expect(stats.aad, 'aad').toBe(1.5)
  stats = computeStatistics(toSortedSamples([1, 2, 3, 4, 5, 6, 7]))
  expect(stats.min, 'min').toBe(1)
  expect(stats.max, 'max').toBe(7)
  expect(stats.df, 'df').toBe(6)
  expectClose(stats.critical, 2.44691185114497, 'critical')
  expect(stats.mean, 'mean').toBe(4)
  expect(stats.variance, 'variance').toBe(4.666666666666667)
  expect(stats.sd, 'sd').toBe(2.160246899469287)
  expect(stats.sem, 'sem').toBe(0.816496580927726)
  expect(stats.moe, 'moe').toBe(stats.sem * stats.critical)
  expectClose(stats.moe, 1.997895160291401, 'moe magnitude')
  expect(stats.rme, 'rme').toBe((stats.moe / stats.mean) * 100)
  expect(stats.p50, 'p50').toBe(4)
  expect(stats.p75, 'p75').toBe(5.5)
  expect(stats.p99, 'p99').toBe(6.9399999999999995)
  expect(stats.p995, 'p995').toBe(6.97)
  expect(stats.p999, 'p999').toBe(6.994)
  expect(stats.mad, 'mad').toBe(2)
  expect(stats.aad, 'aad').toBe(1.7142857142857142)
})

test('computeStatistics - finite percentile despite overflowing sample range', () => {
  const stats = computeStatistics(
    toSortedSamples([-Number.MAX_VALUE, Number.MAX_VALUE])
  )
  const expected = Number.MAX_VALUE / 2
  expect(Math.abs(stats.p75 - expected)).toBeLessThanOrEqual(
    expected * Number.EPSILON
  )
})

test('computeStatistics - sample [0]', () => {
  const stats = computeStatistics(toSortedSamples([0]))
  expect(stats.min, 'min').toBe(0)
  expect(stats.max, 'max').toBe(0)
  expect(stats.df, 'df').toBe(0)
  // df=0 is clamped to a single degree of freedom, whose exact critical value
  // is tan(pi * 0.475).
  expect(stats.critical, 'critical').toBeCloseTo(Math.tan(Math.PI * 0.475), 12)
  expect(stats.mean, 'mean').toBe(0)
  expect(stats.variance, 'variance').toBe(0)
  expect(stats.sd, 'sd').toBe(0)
  expect(stats.sem, 'sem').toBe(0)
  expect(stats.moe, 'moe').toBe(0)
  expect(stats.rme, 'rme').toBe(Number.POSITIVE_INFINITY)
  expect(stats.p50, 'p50').toBe(0)
  expect(stats.p75, 'p75').toBe(0)
  expect(stats.p99, 'p99').toBe(0)
  expect(stats.p995, 'p995').toBe(0)
  expect(stats.p999, 'p999').toBe(0)
  expect(stats.mad, 'mad').toBe(0)
  expect(stats.aad, 'aad').toBe(0)
})

test('computeStatistics - big sample [0, 0, ...]', () => {
  const stats = computeStatistics(
    toSortedSamples([0, ...new Array<number>(1999).fill(0)])
  )
  expect(stats.min, 'min').toBe(0)
  expect(stats.max, 'max').toBe(0)
  expect(stats.df, 'df').toBe(1999)
  expectClose(stats.critical, 1.961151420170562, 'critical')
  expect(stats.mean, 'mean').toBe(0)
  expect(stats.variance, 'variance').toBe(0)
  expect(stats.sd, 'sd').toBe(0)
  expect(stats.sem, 'sem').toBe(0)
  expect(stats.moe, 'moe').toBe(0)
  expect(stats.rme, 'rme').toBe(Number.POSITIVE_INFINITY)
  expect(stats.p50, 'p50').toBe(0)
  expect(stats.p75, 'p75').toBe(0)
  expect(stats.p99, 'p99').toBe(0)
  expect(stats.p995, 'p995').toBe(0)
  expect(stats.p999, 'p999').toBe(0)
  expect(stats.mad, 'mad').toBe(0)
  expect(stats.aad, 'aad').toBe(0)
})

test('computeStatistics - big sample [0, 1, 2, 3, ...(n+1)[]]', () => {
  const stats = computeStatistics(
    toSortedSamples([
      0,
      ...new Array<number>(1999).fill(0).map((_, i) => i + 1),
    ])
  )
  expect(stats.min, 'min').toBe(0)
  expect(stats.max, 'max').toBe(1999)
  expect(stats.df, 'df').toBe(1999)
  expectClose(stats.critical, 1.961151420170562, 'critical')
  expect(stats.mean, 'mean').toBe(999.5)
  expect(stats.variance, 'variance').toBe(333500)
  expect(stats.sd, 'sd').toBe(577.4945887192364)
  expect(stats.sem, 'sem').toBe(12.913171570144957)
  expect(stats.moe, 'moe').toBe(stats.sem * stats.critical)
  expectClose(stats.moe, 25.32468476369591, 'moe magnitude')
  expect(stats.rme, 'rme').toBe((stats.moe / stats.mean) * 100)
  expect(stats.p50, 'p50').toBe(999.5)
  expect(stats.p75, 'p75').toBe(1499.25)
  for (const [quantile, expected] of [
    ['p99', 1979.01],
    ['p995', 1989.005],
    ['p999', 1997.001],
  ] as const) {
    expect(Math.abs(stats[quantile] - expected), quantile).toBeLessThanOrEqual(
      expected * Number.EPSILON
    )
  }
  expect(stats.mad, 'mad').toBe(500)
  expect(Math.abs(stats.aad - 500), 'aad').toBeLessThanOrEqual(
    500 * Number.EPSILON
  )
})

test('computeStatistics - critical value is computed beyond any table bound', () => {
  // The historical table only covered up to 1024 degrees of freedom and
  // returned the normal 1.96 beyond it; the computed value is now exact.
  const stats = computeStatistics(
    toSortedSamples([
      0,
      ...new Array<number>(4999).fill(0).map((_, i) => i + 1),
    ])
  )
  expect(stats.df, 'df').toBe(4999)
  expect(stats.critical, 'critical').toBeGreaterThan(1.96)
  // Cornish-Fisher terms at df=4999: (z^3 + z) / (4 * df) = 4.7455e-4, plus
  // (5z^5 + 16z^3 + 3z) / (96 * df^2) = 1.1295e-7.
  expect(stats.critical, 'critical').toBeCloseTo(
    1.959963984540054 + 4.7455e-4 + 1.1295e-7,
    8
  )
})
