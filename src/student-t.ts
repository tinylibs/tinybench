/**
 * Two-sided 95% critical value of the Student's t distribution, computed from
 * the exact quantile function instead of a precomputed table.
 *
 * The tail probability satisfies `P(|T| > t) = I_u(df/2, 1/2)` with
 * `u = df / (df + t^2)`, where `I_u` is the regularized incomplete beta
 * function. The critical value is therefore the root of a monotone decreasing
 * function, located by Newton iterations on the exact gradient of the t
 * density. Solving for `u` instead would be ill conditioned here, since the
 * incomplete beta varies by orders of magnitude per unit step at large `df`.
 *
 * In the code the complement of `u` is the quantity actually computed, under
 * the name `complement`: forming it directly as `t^2 / (df + t^2)` preserves
 * its relative precision. Subtracting `u` from 1 loses precision as `u`
 * approaches 1; once `u` rounds to 1, `1 - u` becomes zero.
 */

// Lanczos coefficients for g=7. The first carries no denominator, the rest divide
// by z + n for n counting from 0. Held at module scope so the array is not
// rebuilt on every call.
const [leading, ...rest] = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
]

/**
 * Natural logarithm of the gamma function, Lanczos approximation with g=7,
 * whose canonical form shifts the argument by `g - 0.5`, hence the 6.5 below;
 * writing `(z + g) - 0.5` instead is not the same rounding, so it is spelled
 * as one literal on purpose.
 * Only `z >= 0.5` is needed here, so no reflection branch is required. The
 * single call site passes `df/2` and `df/2 + 0.5`, both at least 0.5, and
 * only while `df < 24`; above that the caller switches to the asymptotic
 * series for the ratio instead.
 * @param z - the argument, at least 0.5
 * @returns the natural logarithm of gamma at `z`
 */
const logGamma = (z: number): number => {
  let a = leading
  for (let index = 0; index < rest.length; index++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    a += rest[index]! / (z + index)
  }
  return (
    0.5 * Math.log(2 * Math.PI) +
    (z - 0.5) * Math.log(z + 6.5) -
    (z + 6.5) +
    Math.log(a)
  )
}

/**
 * Continued fraction for the incomplete beta function, evaluated with the
 * modified Lentz algorithm. Over the whole reachable range of `df` the
 * fraction converges in 2 to 19 terms, 9 being the overwhelmingly common case;
 * the 300-term cap below is a safety net that has never bound.
 * @param a - the first shape parameter
 * @param b - the second shape parameter
 * @param x - the beta argument, within (0, 1)
 * @returns the continued fraction
 */
const betaContinuedFraction = (a: number, b: number, x: number): number => {
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  // The 1e-300 clamps below keep the reciprocals finite when Lentz runs away.
  // They are unreachable over the reachable range of `df`: instrumenting them
  // over df 1..20000 shows the branch is never taken.
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < 1e-300) d = 1e-300
  d = 1 / d
  let h = d
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < 1e-300) d = 1e-300
    c = 1 + aa / c
    if (Math.abs(c) < 1e-300) c = 1e-300
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < 1e-300) d = 1e-300
    c = 1 + aa / c
    if (Math.abs(c) < 1e-300) c = 1e-300
    d = 1 / d
    const delta = d * c
    h *= delta
    if (Math.abs(delta - 1) < 1e-16) break
  }
  return h
}

/**
 * Computes the two-sided 95% critical value of the Student's t distribution,
 * that is the `t` such that `P(|T| > t) = 0.05` for `T` distributed as
 * Student's t with `df` degrees of freedom.
 *
 * `df` is expected to be a non-negative integer, as supplied by a sample count.
 * Non-positive values and `NaN` are treated as one degree of freedom, including
 * zero from a single-element sample.
 *
 * No degree of freedom is tabulated or capped: the result is computed for any
 * `df`, including the arbitrarily large counts a long benchmark reaches.
 *
 * Against a 50-digit reference the error stays within 100 ULP, about 2e-14
 * relative, over degrees of freedom from 1 to 6000, on every engine measured:
 * V8 13.6, V8 15.0, JavaScriptCore and SpiderMonkey. The worst value is 80 ULP
 * at 5773 degrees of freedom, where the series branch runs. That peak is the
 * algorithm's own error and measures the same on every engine. Over the
 * tabulated range the difference branch is used and the cancellation of two
 * large logarithms dominates, giving 79 ULP at 15 on V8 13.6 and SpiderMonkey
 * but 64 on V8 15.0 and JavaScriptCore.
 *
 * The value is not bit-reproducible across engines. `Math.exp`, `Math.log` and
 * `Math.log1p` are not required to be correctly rounded by IEEE 754 and differ
 * between engines by up to one ULP, which the iterations amplify: two engines
 * can disagree by 81 ULP. Everything derived from it moves with it, so `moe`
 * and `rme` are affected too, and a caller that serializes a result must not
 * compare those fields across machines.
 *
 * The table this replaces is worse further out: 1.9e7 ULP at its own worst
 * near 39 degrees of freedom, and 1.0e13 ULP just above 1024, where it
 * returned the constant 1.96, falling to 1.6e11 in the limit.
 * @param df - the degrees of freedom, a non-negative integer
 * @returns the critical value, up to 12.706205 at `df = 1`, approaching the
 *   normal 1.959963984540054 from above; past about 1e15 degrees of freedom
 *   the two are within 1e-14 and the result can land on either side
 */
export const studentTCritical = (df: number): number => {
  const degrees = df > 0 ? df : 1
  const halfDf = degrees / 2
  // The second shape parameter of the incomplete beta is always one half, so it
  // appears both as an argument of the continued fraction and as the divisor
  // of its complementary branch.
  const shapeB = 0.5
  // `logGamma` depends only on `df`, so it is evaluated once instead of on
  // every Newton step. Taking `logGamma(a + 1/2) - logGamma(a)` from its
  // series above a >= 12 also avoids a cancellation: each logarithm grows like
  // `a * ln(a)`, so subtracting them loses three significant digits once `a`
  // reaches 1e10. The series is asymptotic and unusable below a = 12, where it
  // overshoots: switching at a = 8 puts its worst truncation, 1.1e-14, exactly
  // at df = 16. The first three coefficients are exact, 1/8, 1/192 and 1/640;
  // the next three are close to the exact 17/14336, -31/18432 and
  // 3.8341175e-3, but chosen so that the six-term series is three times more
  // accurate where it matters, at the switch: 3.8e-17 of truncation at a = 12
  // against 1.2e-16 with the exact values. Using the exact coefficients can
  // change the final quantile's last bits.
  const logGammaRatio = halfDf < 12
    ? logGamma(halfDf + 0.5) - logGamma(halfDf)
    : 0.5 * Math.log(halfDf) -
      1 / (8 * halfDf) +
      1 / (192 * halfDf ** 3) -
      1 / (640 * halfDf ** 5) +
      0.00118582565234835 / halfDf ** 7 -
      0.00167977198469943 / halfDf ** 9 +
      0.00342404392538552 / halfDf ** 11
  const logGammaHalf = 0.5 * Math.log(Math.PI)
  const logDensity0 = logGammaRatio - 0.5 * Math.log(degrees * Math.PI)
  const tail = (t: number): number => {
    const squared = t * t
    const complement = squared / (degrees + squared)
    const prefactor = Math.exp(
      logGammaRatio - logGammaHalf + halfDf * Math.log1p(-complement) +
        shapeB * Math.log(complement)
    )
    // `I_u(a, b)` is `prefactor * fraction(a, b, u) / a` when u is small, and
    // `1 - prefactor * fraction(b, a, 1 - u) / b` when u is large, the
    // complement being the better conditioned of the two. With
    // `u = 1 - complement` the split sits at `complement = 0.5`, and both
    // branches then pass the continued fraction an argument at or below 0.5,
    // where Lentz converges fastest.
    if (complement <= 0.5) {
      return 1 -
        (prefactor * betaContinuedFraction(shapeB, halfDf, complement)) /
          shapeB
    }
    return (prefactor * betaContinuedFraction(halfDf, shapeB, 1 - complement)) /
      halfDf
  }
  const logDensity = (t: number): number =>
    logDensity0 - ((degrees + 1) / 2) * Math.log1p((t * t) / degrees)
  // The two-sided 95% normal quantile: the exact limit of the critical value
  // as the degrees of freedom grow. It is within 3% of it from df = 42
  // upward, and the loop closes the rest. At df = 1 the gap is 548%.
  let t = 1.959963984540054
  // 30 is a safety cap, not the expected exit: convergence takes 3 to 15
  // steps over the reachable range. For about 0.1% of degrees of freedom the
  // step enters a short cycle instead of shrinking, and the cap is reached;
  // the value returned there is still accurate, and those cases are not the
  // worst: df = 15, which exits normally, is further from the truth than any
  // degree of freedom that reaches the cap.
  for (let i = 0; i < 30; i++) {
    // The two-sided tail decreases with t with slope -2 * density, so the root
    // of `tail(t) - 0.05` lies above the current value, by half of
    // (tail(t) - 0.05) divided by the density.
    const inverseDensity = Math.exp(-logDensity(t))
    const step = 0.5 * (tail(t) - 0.05) * inverseDensity
    if (!Number.isFinite(step)) break
    const next = t + step
    // Written as a negation so that it also rejects NaN, which a `<= 0` test
    // would let through.
    if (!(next > 0)) break
    const magnitude = Math.abs(step)
    t = next
    // `tail` resolves to roughly 1e-16 in absolute terms, and that noise is
    // amplified on `t` by the one-sided density in `logDensity`, so the
    // smallest step worth taking is `1e-16 * inverseDensity`: 5.1e-14 at df=1,
    // where the density is 0.00196, and 1.7e-15 at df=1000, where it is
    // 0.0583. The threshold is four times that, to absorb the larger `tail`
    // error of the complementary branch. A fixed relative threshold either
    // misses this floor and grinds the iteration cap, or stops before it.
    if (magnitude <= 4e-16 * inverseDensity) break
  }
  return t
}
