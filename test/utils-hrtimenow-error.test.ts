import { expect, test } from 'vitest'

test('hrtimeNow - process.hrtime undefined', async () => {
  // @ts-expect-error set to undefined to simulate unsupported environment
  process.hrtime = undefined
  // @ts-expect-error we use a query param to avoid loading cached module
  const hrtimeNow = (await import('../src/utils?in_test=1') as { hrtimeNow: () => number }).hrtimeNow

  expect(typeof hrtimeNow).toBe('function')
  expect(() => hrtimeNow()).toThrowError(new Error('hrtime.bigint() is not supported in this JS environment'))
})
