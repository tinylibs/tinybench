// Portions copyright evanwashere. 2024. All Rights Reserved.
// Portions copyright QuiiBz. 2023-2024. All Rights Reserved.

import type { TimestampValue } from './types'

/**
 * Converts nanoseconds to milliseconds.
 * @param ns - the nanoseconds to convert
 * @returns the milliseconds
 */
export const nToMs = (ns: TimestampValue) => Number(ns) / 1e6

/**
 * Converts milliseconds to nanoseconds.
 * @param ms - the milliseconds to convert
 * @returns the nanoseconds
 */
export const mToNs = (ms: TimestampValue) => Number(ms) * 1e6

/**
 * Just a passthrough function for milliseconds.
 * @param ms - the milliseconds
 * @returns the milliseconds
 */
export const mToMs = <T, R extends T = T>(ms: T): R => ms as R // eslint-disable-line @typescript-eslint/no-unnecessary-type-parameters

/**
 * Converts nanoseconds to milliseconds. Expects bigint input.
 * @param ns - the nanoseconds
 * @returns the milliseconds
 */
export const nBigintToMs = (ns: bigint) => Number(ns) / 1e6

/**
 * Converts milliseconds to nanoseconds as bigint.
 * @param ms - milliseconds
 * @returns nanoseconds as bigint
 */
export const mToNsBigint = (ms: number) => BigInt(Math.round(ms * 1e6))
