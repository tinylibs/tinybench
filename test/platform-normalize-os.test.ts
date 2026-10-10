import { expect, test } from 'vitest'

import { normalizeOSType } from '../src/platform'

test('normalizeOS with non string value returns unknown', () => {
  expect(normalizeOSType(undefined)).toBe('unknown')
  expect(normalizeOSType(123)).toBe('unknown')
  expect(normalizeOSType(null)).toBe('unknown')
  expect(normalizeOSType({})).toBe('unknown')
  expect(normalizeOSType([])).toBe('unknown')
})

test('normalizeOS defaults provided by node', () => {
  expect(normalizeOSType('aix')).toBe('aix')
  expect(normalizeOSType('android')).toBe('android')
  expect(normalizeOSType('darwin')).toBe('darwin')
  expect(normalizeOSType('freebsd')).toBe('freebsd')
  expect(normalizeOSType('haiku')).toBe('haiku')
  expect(normalizeOSType('linux')).toBe('linux')
  expect(normalizeOSType('openbsd')).toBe('openbsd')
  expect(normalizeOSType('sunos')).toBe('sunos')
  expect(normalizeOSType('win32')).toBe('win32')
  expect(normalizeOSType('cygwin')).toBe('cygwin')
  expect(normalizeOSType('netbsd')).toBe('netbsd')
})

test('normalizeOS returns lowercase', () => {
  expect(normalizeOSType('Linux')).toBe('linux')
  expect(normalizeOSType('SunOS')).toBe('sunos')
})

test('normalizeOS with alternative Windows values', () => {
  expect(normalizeOSType('Windows')).toBe('win32')
  expect(normalizeOSType('Win16')).toBe('win16')
  expect(normalizeOSType('Win32')).toBe('win32')
  expect(normalizeOSType('WinCE')).toBe('wince')
})
