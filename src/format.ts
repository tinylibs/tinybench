/**
 * Formats a number with the specified significant digits and maximum fraction digits.
 * @param value - the number to format
 * @param significantDigits - the number of significant digits in the output to aim for
 * @param maxFractionDigits - hard limit for the number of digits after the decimal dot
 * @returns the formatted number
 */
export const formatNumber = (
  value: number,
  significantDigits = 5,
  maxFractionDigits = 2
): string => {
  if (value === Number.POSITIVE_INFINITY) return '+∞'
  if (value === Number.NEGATIVE_INFINITY) return '-∞'
  if (value !== value) return 'NaN' // eslint-disable-line no-self-compare

  const absValue = Math.abs(value)

  // Round large numbers to integers, but not to multiples of 10.
  // The actual number of significant digits may be more than `significantDigits`.
  if (absValue >= 10 ** significantDigits) {
    return value.toFixed()
  }

  // Round small numbers to have `maxFractionDigits` digits after the decimal dot.
  // The actual number of significant digits may be less than `significantDigits`.
  if (absValue < 10 ** (significantDigits - maxFractionDigits)) {
    return value.toFixed(maxFractionDigits)
  }

  // Avoid scientific notation
  const decimals = Math.min(
    Math.max(0, significantDigits - (Math.floor(Math.log10(absValue)) + 1)),
    maxFractionDigits
  )

  return value.toFixed(decimals)
}
