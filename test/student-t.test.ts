import { expect, test } from 'vitest'

import { studentTCritical } from '../src/student-t'

/**
 * Independent oracle for the t density.
 *
 * `logGamma` here is the Stirling series after an exact upward shift, not the
 * Lanczos approximation the implementation uses, so a mistake in the Lanczos
 * coefficients, in its argument shift, or in the incomplete beta shows up as a
 * failure instead of cancelling out.
 * @param z - the gamma argument, at least 0.5
 * @returns the natural logarithm of gamma at `z`
 */
const oracleLogGamma = (z: number): number => {
  // Stirling coefficients B_2k / (2k(2k-1)).
  const coefficients = [
    1 / 12, -1 / 360, 1 / 1260, -1 / 1680, 1 / 1188, -691 / 360360, 1 / 156,
  ]
  const stirling = (argument: number): number => {
    let series = 0
    for (const [index, c] of coefficients.entries()) {
      series += c / argument ** (2 * index + 1)
    }
    return (
      (argument - 0.5) * Math.log(argument) -
      argument +
      0.5 * Math.log(2 * Math.PI) +
      series
    )
  }
  // Stirling alone is accurate enough from 30 up. Below it, the exact upward
  // shift protects the small arguments; it is skipped for large ones because
  // subtracting a 20-term recurrence would only add cancellation.
  if (z >= 30) return stirling(z)
  const shift = 20
  let recurrence = 0
  for (let k = 0; k < shift; k++) recurrence += Math.log(z + k)
  return stirling(z + shift) - recurrence
}

/**
 * Probability density of Student's t with `df` degrees of freedom, finite and
 * smooth at 0 for every `df >= 1`.
 * @param t - the value at which the density is evaluated
 * @param df - the degrees of freedom
 * @returns the probability density
 */
const tDensity = (t: number, df: number): number =>
  Math.exp(
    oracleLogGamma((df + 1) / 2) -
      oracleLogGamma(df / 2) -
      0.5 * Math.log(df * Math.PI) -
      ((df + 1) / 2) * Math.log1p((t * t) / df)
  )

/**
 * One-sided tail probability `P(T > t)`, obtained by integrating the t density
 * from 0 to t with Simpson's rule: the density integrates to 0.5 over
 * `[0, infinity)`. Validated against 50-digit reference values below, so a
 * wrong integration cannot validate a wrong implementation.
 * @param t - the value above which the tail is measured
 * @param df - the degrees of freedom
 * @param steps - the number of integration intervals, even
 * @returns the one-sided tail probability
 */
const oneSidedTail = (t: number, df: number, steps = 20_000): number => {
  const h = t / steps
  let sum = tDensity(0, df) + tDensity(t, df)
  for (let i = 1; i < steps; i++) {
    sum += (i % 2 === 0 ? 2 : 4) * tDensity(i * h, df)
  }
  return 0.5 - (sum * h) / 3
}

// Critical values solved to 50 digits by bisection on
// `I_u(df/2, 1/2) = 0.05`, with `logGamma` from the Stirling series. They are
// not the entries of the table this change removes: that table was off by up
// to 1.9e7 ULP near 39 degrees of freedom.
//
// The grid is not a round-number sweep. Two boundaries have to sit inside it,
// and each was missed once by sampling: the switch to the series at df=24,
// where 20 and 25 alone left 21 to 23 unguarded, and the region above 1024,
// where the removed table returned a constant and a round-number grid found
// nothing to check. The worst measured value on this grid is 80 ULP at df=5773.
const reference = [
  [1, 12.706204736174705],
  [2, 4.302652729749464],
  [3, 3.1824463052837095],
  [4, 2.7764451051977943],
  [5, 2.5705818356363155],
  [6, 2.44691185114497],
  [10, 2.228138851986275],
  [15, 2.1314495455597755],
  [16, 2.1199052992212546],
  [17, 2.109815577833317],
  [20, 2.085963447265865],
  [21, 2.0796138447276804],
  [22, 2.0738730679040263],
  [23, 2.0686576104190486],
  [24, 2.063898561628026],
  [25, 2.0595385527532977],
  [30, 2.042272456301238],
  [31, 2.0395134463964086],
  [40, 2.0210753903062733],
  [50, 2.008559112100761],
  [64, 1.997729654317693],
  [74, 1.9925434951809327],
  [79, 1.990450210230129],
  [80, 1.9900634212544461],
  [100, 1.9839715185235522],
  [120, 1.979930405082441],
  [150, 1.9759053308966206],
  [200, 1.9718962236339095],
  [1000, 1.9623390808264085],
  [1024, 1.9622833497895975],
  [1025, 1.9622810843660599],
  [1109, 1.9621053897645868],
  [1740, 1.9613282915517927],
  [1999, 1.961151420170562],
  [4838, 1.9604544464543687],
  [5000, 1.960438551706508],
  [5125, 1.9604269742101139],
  [5773, 1.9603749944518272],
] as const

test('oracle - reproduces the 0.025 one-sided tail at reference critical values', () => {
  for (const [df, critical] of reference) {
    expect(
      oneSidedTail(critical, df),
      `oracle df=${String(df)}`
    ).toBeCloseTo(0.025, 11)
  }
})

test('studentTCritical - two-sided tail probability is 0.05', () => {
  for (const df of [1, 2, 3, 4, 7, 15, 40, 120, 400, 1000, 5000]) {
    const critical = studentTCritical(df)
    expect(
      2 * oneSidedTail(critical, df),
      `df=${String(df)} two-sided tail`
    ).toBeCloseTo(0.05, 9)
  }
})

test('studentTCritical - matches published NIST critical values', () => {
  const nist = [
    [1, 12.706], [2, 4.303], [3, 3.182], [4, 2.776], [5, 2.571],
    [6, 2.447], [7, 2.365], [8, 2.306], [9, 2.262], [10, 2.228],
    [15, 2.131], [20, 2.086], [25, 2.060], [30, 2.042], [40, 2.021],
    [50, 2.009], [60, 2.000], [80, 1.990], [100, 1.984], [120, 1.980],
  ] as const
  for (const [df, expected] of nist) {
    expect(studentTCritical(df), `df=${String(df)}`).toBeCloseTo(expected, 3)
  }
})

test('studentTCritical - df=1 has the closed form tan(pi * 0.475)', () => {
  expect(studentTCritical(1)).toBeCloseTo(Math.tan(Math.PI * 0.475), 12)
})

test('studentTCritical - tracks the 50-digit reference across the grid', () => {
  // `Math.ulp` is ES2026 and absent from some supported runtimes, so derive
  // the spacing: for x in [2^e, 2^(e+1)) consecutive doubles are 2^(e - 52)
  // apart. Using `|x| * Number.EPSILON` instead would understate by 1.3 to 2.
  const ulpOf = (x: number): number =>
    2 ** (Math.floor(Math.log2(Math.abs(x))) - 52)
  // The bound is what is asserted, not the location of the peak. The peak sits
  // at df=15 on Linux and df=10 on the macOS runners, so where it lands is a
  // property of the platform's math library rather than of this code, and
  // pinning it made the suite fail on three CI jobs.
  for (const [df, expected] of reference) {
    expect(
      Math.abs(studentTCritical(df) - expected) / ulpOf(expected),
      `df=${String(df)}`
    ).toBeLessThan(100)
  }
})

test('studentTCritical - the series switch sits where it is meant to', () => {
  // The error is decided by which side of df=24 the gamma ratio is computed
  // on, so this checks the two degrees of freedom that sit immediately above
  // that boundary. Moving the switch to 13 puts 96 ULP at df=25, to 16 puts
  // 167 ULP at df=31, and to 20 puts 225 ULP at df=36: all three stay under the
  // 100 ULP global bound and fail here. A blanket bound over the whole series
  // region would not separate them, since legitimate values reach 80 ULP well
  // above 1024.
  const ulpOf = (x: number): number =>
    2 ** (Math.floor(Math.log2(Math.abs(x))) - 52)
  for (const [df, expected] of reference) {
    if (df !== 25 && df !== 31) continue
    expect(
      Math.abs(studentTCritical(df) - expected) / ulpOf(expected),
      `df=${String(df)}, just above the switch`
    ).toBeLessThan(60)
  }
})

test('studentTCritical - converges to the normal quantile as df grows', () => {
  // The normal two-sided 95% quantile is 1.959963984540054, approached from
  // above by the Student critical value for any finite df.
  const normal = 1.959963984540054
  // The 1/df asymptotic term is (z^3 + z) / (4 * df) = 2.372e-6 at 1e6.
  expect(studentTCritical(1e6)).toBeCloseTo(normal + 2.372e-6, 9)
  expect(studentTCritical(1e8)).toBeCloseTo(normal, 7)
  let previous = Number.POSITIVE_INFINITY
  for (const df of [1, 2, 5, 10, 50, 200, 1000, 10_000, 1e6]) {
    const critical = studentTCritical(df)
    expect(critical, `df=${String(df)} strictly decreasing`).toBeLessThan(previous)
    expect(critical, `df=${String(df)} above normal`).toBeGreaterThan(normal)
    previous = critical
  }
})

test('studentTCritical - strictly decreasing in the degrees of freedom', () => {
  for (const df of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 30, 100, 1000]) {
    expect(
      studentTCritical(df + 1),
      `df=${String(df + 1)} below df=${String(df)}`
    ).toBeLessThan(studentTCritical(df))
  }
})

test('studentTCritical - stays within the historical table bounds', () => {
  // The largest tabulated value was 12.7062 (df=1) and the limit approached
  // the normal quantile from above; no degrees of freedom may fall outside.
  for (const df of [0, 1, 2, 5, 50, 500, 5000, 1e9]) {
    expect(studentTCritical(df), `df=${String(df)}`).toBeLessThan(12.71)
    expect(studentTCritical(df), `df=${String(df)}`).toBeGreaterThan(1.9599)
  }
})

test('studentTCritical - clamps non-positive degrees of freedom to one', () => {
  // A single-sample benchmark reports df=0; the value stays defined.
  const one = studentTCritical(1)
  expect(studentTCritical(0)).toBe(one)
  expect(studentTCritical(-5)).toBe(one)
  expect(one).toBeCloseTo(12.706, 3)
})

test('studentTCritical - reaches the normal quantile for any finite df', () => {
  // The complement is formed as t^2 / (df + t^2) rather than as 1 - u, so
  // the quantile stays accurate far beyond where u would round to 1.
  for (const df of [1e12, 1e15, Number.MAX_SAFE_INTEGER]) {
    expect(
      studentTCritical(df),
      `df=${String(df)}`
    ).toBeCloseTo(1.959963984540054, 11)
  }
  // At 1e9 the continued fraction still runs on 1e8-magnitude terms, which
  // costs about three digits; still far better than the removed table, which
  // returned the normal 1.96 there.
  expect(studentTCritical(1e9)).toBeCloseTo(1.959963984540054, 8)
})
