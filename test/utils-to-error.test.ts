import { expect, test } from 'vitest'

import {
  toError,
} from '../src/utils'

test('toError - null', () => {
  expect(toError(null)).toStrictEqual(new Error())
})
test('toError - undefined', () => {
  expect(toError(undefined)).toStrictEqual(new Error())
})

test('toError - Error', () => {
  const error = new Error('test error')
  expect(toError(error)).toBe(error)
})

test('toError - string', () => {
  expect(toError('test error')).toStrictEqual(new Error('test error'))
})

test('toError - object with message', () => {
  expect(toError({ message: 'test error' })).toStrictEqual(new Error('test error'))
})

test('toError - object without message', () => {
  expect(toError({ foo: 'bar' })).toStrictEqual(new Error())
})

test('toError - number', () => {
  expect(toError(42)).toStrictEqual(new Error('42'))
})

test('toError - boolean', () => {
  expect(toError(true)).toStrictEqual(new Error('true'))
})

test('toError - symbol', () => {
  expect(toError(Symbol('test'))).toStrictEqual(new Error('Symbol(test)'))
})

test('toError - function', () => {
  const errorFunction = () => { throw new Error('errorFunction') }
  expect(toError(errorFunction)).toStrictEqual(new Error('errorFunction'))
})

test('toError - array', () => {
  expect(toError(['error message'])).toStrictEqual(new Error())
})
