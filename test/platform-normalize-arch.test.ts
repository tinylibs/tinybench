import { expect, test } from 'vitest'

import { normalizeMachine } from '../src/platform'

test('normalizeArch with non string value returns unknown', () => {
  expect(normalizeMachine(undefined)).toBe('unknown')
  expect(normalizeMachine(123)).toBe('unknown')
  expect(normalizeMachine(null)).toBe('unknown')
  expect(normalizeMachine({})).toBe('unknown')
  expect(normalizeMachine([])).toBe('unknown')
})

test('normalizeArch', () => {
  expect(normalizeMachine('arm')).toBe('arm')
  expect(normalizeMachine('arm64')).toBe('arm64')
  expect(normalizeMachine('ia32')).toBe('x32')
  expect(normalizeMachine('loong64')).toBe('loong64')
  expect(normalizeMachine('mips')).toBe('mips')
  expect(normalizeMachine('mipsel')).toBe('mipsel')
  expect(normalizeMachine('ppc64')).toBe('ppc64')
  expect(normalizeMachine('riscv64')).toBe('riscv64')
  expect(normalizeMachine('s390x')).toBe('s390x')
  expect(normalizeMachine('x64')).toBe('x64')
})

test('normalizeArch with alternative values', () => {
  expect(normalizeMachine('ia32')).toBe('x32')
  expect(normalizeMachine('amd64')).toBe('x64')
  expect(normalizeMachine('x86')).toBe('x86')
  expect(normalizeMachine('x86_64')).toBe('x64')
})

test('normalizeArch returns lowercase', () => {
  expect(normalizeMachine('ARM')).toBe('arm')
  expect(normalizeMachine('AARCH64')).toBe('aarch64')
})
