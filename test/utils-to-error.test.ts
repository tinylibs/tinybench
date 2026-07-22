import { expect, test } from 'vitest'

import { toError } from '../src/utils'

test('toError - null', () => {
  expect(toError(null)).toBeInstanceOf(Error)
  expect(toError(null).message).toBe('')
})
test('toError - undefined', () => {
  expect(toError(undefined)).toBeInstanceOf(Error)
  expect(toError(undefined).message).toBe('')
})

test('toError - Error', () => {
  const error = new Error('test error')
  expect(toError(error)).toBe(error)
})

test('toError - string', () => {
  expect(toError('test error')).toBeInstanceOf(Error)
  expect(toError('test error').message).toBe('test error')
})

test('toError - object with message', () => {
  expect(toError({ message: 'test error' })).toBeInstanceOf(Error)
  expect(toError({ message: 'test error' }).message).toBe('test error')
})

test('toError - object without message', () => {
  expect(toError({ foo: 'bar' })).toBeInstanceOf(Error)
  expect(toError({ foo: 'bar' }).message).toBe('')
})

test('toError - number', () => {
  expect(toError(42)).toBeInstanceOf(Error)
  expect(toError(42).message).toBe('42')
})

test('toError - boolean', () => {
  expect(toError(true)).toBeInstanceOf(Error)
  expect(toError(true).message).toBe('true')
})

test('toError - symbol', () => {
  expect(toError(Symbol('test'))).toBeInstanceOf(Error)
  expect(toError(Symbol('test')).message).toBe('Symbol(test)')
})

test('toError - function', () => {
  const errorFunction = () => {
    throw new Error('errorFunction')
  }
  expect(toError(errorFunction)).toBeInstanceOf(Error)
  expect(toError(errorFunction).message).toBe('errorFunction')
})

test('toError - array', () => {
  expect(toError(['error message'])).toBeInstanceOf(Error)
  expect(toError(['error message']).message).toBe('')
})
