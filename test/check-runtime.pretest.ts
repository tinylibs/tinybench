import { expect, test } from 'vitest'

import { detectRuntime } from '../src/utils'

test('bench table (sync)', () => {
  expect(detectRuntime().runtime).toBe(process.env.RUNTIME)
})
