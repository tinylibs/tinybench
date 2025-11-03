import { expect, test } from 'vitest'

import {
  nToMs,
} from '../src/utils'

test('nToMs', () => {
  expect(nToMs(1)).toBe(0.000001)
  expect(nToMs(0)).toBe(0)
  expect(nToMs(1234567890)).toBe(1234.56789)
  expect(nToMs(-1)).toBe(-0.000001)
})
