import { expect, test } from 'vitest'

import { assert } from '../src/utils'

test('assert - true', () => {
  expect(() => {
    assert(true, 'everything fine')
  }).not.toThrow()
})

test('assert - false', () => {
  expect(() => {
    assert(false, 'something went wrong')
  }).toThrowError(new Error('something went wrong'))
})

test('assert - false stack trace', () => {
  /**
   *
   */
  function testFunction () {
    assert(false, 'stack trace test')
  }

  try {
    testFunction()
  } catch (error) {
    expect(error).toBeInstanceOf(Error)
    if (error instanceof Error) {
      expect(error.stack).toBeDefined()
      if (error.stack) {
        const stackLines = error.stack.split('\n')
        expect(stackLines[0]).toBe('Error: stack trace test')
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(stackLines[1]!.trim().startsWith('at testFunction')).toBe(true)
      }
    }
  }
})
