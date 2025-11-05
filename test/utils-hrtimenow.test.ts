import { expect, test } from 'vitest'

test('hrtimeNow', async () => {
  const hrtimeNow = (await import('../src/utils')).hrtimeNow

  expect(typeof hrtimeNow).toBe('function')
  expect(typeof hrtimeNow()).toBe('number')
})
