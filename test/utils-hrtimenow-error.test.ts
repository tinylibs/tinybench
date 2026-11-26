import assert from 'node:assert/strict'
import { expect, test } from 'vitest'

import type * as timestampModule from '../src/timestamp'

test.each([
  ['undefined', undefined],
  ['missing-bigint', () => [0, 0]],
  ['non-callable-bigint', Object.assign(() => [0, 0], { bigint: 0 })],
])('hrtimeNow - process.hrtime %s', async (mode, hrtime) => {
  const originalHrtime = process.hrtime
  try {
    // @ts-expect-error simulate unsupported process shims
    process.hrtime = hrtime

    // Static import cannot work: `hrtimeBigint` binds its unsupported-
    // environment fallback at module evaluation, so evaluation must happen
    // AFTER the mutation above. A distinct query suffix per case busts the
    // runtime module cache — required under bun test, which shares its
    // registry across test files (`./timestamp` has held the binding since
    // the utils split) and harmless under vitest's per-file isolation.
    // The specifier is intentionally typed as `string` so TypeScript does
    // not try to resolve the query as a module path. The cast reuses the
    // module's own type (single source of truth) instead of duplicating the
    // `hrtimeNow` signature inline.
    const specifier = `../src/timestamp?in_test=${mode}`
    const { hrtimeNow, performanceNow } = (await import(specifier)) as typeof timestampModule
    expect(typeof hrtimeNow).toBe('function')
    expect(Number.isFinite(performanceNow())).toBe(true)
    expect(() => hrtimeNow()).toThrow(
      new Error('hrtime.bigint() is not supported in this JS environment')
    )
  } finally {
    // Restore the shared environment: bun test runs the whole suite in a
    // single process, so later test files must not inherit the mutation.
    process.hrtime = originalHrtime
  }
})

test.each(['hrtime', 'bigint'])('hrtimeNow - captures the %s getter once', async mode => {
  const originalHrtime = Object.getOwnPropertyDescriptor(process, 'hrtime')
  assert(originalHrtime !== undefined)
  let reads = 0
  const bigint = function (this: unknown) {
    expect(this).toBe(hrtime)
    return 42_000_000n
  }
  const hrtime = Object.assign(() => [0, 0], { bigint })
  try {
    if (mode === 'bigint') {
      Object.defineProperty(hrtime, 'bigint', {
        get: () => ++reads === 1 ? bigint : undefined,
      })
      process.hrtime = hrtime as typeof process.hrtime
    } else {
      Object.defineProperty(process, 'hrtime', {
        configurable: true,
        get: () => ++reads === 1 ? hrtime : undefined,
      })
    }
    const specifier = `../src/timestamp?in_test=getter-${mode}`
    const { hrtimeNow } = (await import(specifier)) as typeof timestampModule
    expect(hrtimeNow()).toBe(42)
    expect(reads).toBe(1)
  } finally {
    Object.defineProperty(process, 'hrtime', originalHrtime)
  }
})
