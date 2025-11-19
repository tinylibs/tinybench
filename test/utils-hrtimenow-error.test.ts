import { expect, test } from 'vitest'

test('hrtimeNow - process.hrtime undefined', async () => {
  // @ts-expect-error set to undefined to simulate unsupported environment
  process.hrtime = undefined

  const hrtimeNow = (
    (await import(
      'Bun' in globalThis ? '../src/utils?in_test=1' : '../src/utils'
    )) as { hrtimeNow: () => number }
  ).hrtimeNow

  expect(typeof hrtimeNow).toBe('function')
  expect(() => hrtimeNow()).toThrowError(
    new Error('hrtime.bigint() is not supported in this JS environment')
  )
})
