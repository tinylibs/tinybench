import { expect, test } from 'vitest'

import type * as timestampModule from '../src/timestamp'

test('hrtimeNow - process.hrtime undefined', async () => {
  const originalHrtime = process.hrtime
  try {
    // @ts-expect-error set to undefined to simulate unsupported environment
    process.hrtime = undefined

    // Static import cannot work: `hrtimeBigint` binds its unsupported-
    // environment fallback at module evaluation, so evaluation must happen
    // AFTER the mutation below. The `?in_test=1` query suffix busts the
    // runtime module cache — required under bun test, which shares its
    // registry across test files (`./timestamp` has held the binding since
    // the utils split) and harmless under vitest's per-file isolation.
    // The specifier is intentionally typed as `string` so TypeScript does
    // not try to resolve the query as a module path. The cast reuses the
    // module's own type (single source of truth) instead of duplicating the
    // `hrtimeNow` signature inline.
    const specifier = '../src/timestamp?in_test=1' as string
    const { hrtimeNow } = (await import(specifier)) as typeof timestampModule
    expect(typeof hrtimeNow).toBe('function')
    expect(() => hrtimeNow()).toThrow(
      new Error('hrtime.bigint() is not supported in this JS environment')
    )
  } finally {
    // Restore the shared environment: bun test runs the whole suite in a
    // single process, so later test files must not inherit the mutation.
    process.hrtime = originalHrtime
  }
})
