import { expect, test } from 'vitest'

import { mToNs, mToNsBigint } from '../src/utils'

test('mToNs', () => {
  expect(mToNs(1)).toBe(1000000)
  expect(mToNs(0.000001)).toBe(1)
  expect(mToNs(1234.56789)).toBe(1234567890)
  expect(mToNs(-1)).toBe(-1000000)
})

test('mToNsBigint', () => {
  expect(mToNsBigint(1)).toBe(1000000n)
  expect(mToNsBigint(1000)).toBe(1000000000n)
  expect(mToNsBigint(100.5)).toBe(100500000n)
  expect(mToNsBigint(1234.56789)).toBe(1234567890n)
})
