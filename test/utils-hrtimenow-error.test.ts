import { expect, test } from 'vitest'

test('hrtimeNow', async () => {
  // @ts-expect-error set to undefined to simulate unsupported environment
  process.hrtime = undefined
  const hrtimeNow = (await import('../src/utils')).hrtimeNow

  expect(typeof hrtimeNow).toBe('function')
  expect(() => hrtimeNow()).toThrowError(new Error('hrtime.bigint() is not supported in this JS environment'))
})
