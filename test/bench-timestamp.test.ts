import { expect, test } from 'vitest'

import { Bench } from '../src'

test('should throw an error if timestamp and now is provided', () => {
  expect(() => new Bench({
    now: () => 100,
    throws: true,
    timestamp: {
      fn: () => 100,
      fromMs: (ms) => ms,
      name: 'custom',
      toMs: (ts) => ts as number,
    },
  })).toThrowError('Cannot set both `now` and `timestamp` options')
})

test('should convert now function to custom timestamp', () => {
  const bench = new Bench({
    now: () => 100,
    throws: true,
  })

  expect(bench.timestamp.fn()).toBe(100)
  expect(bench.timestamp.name).toBe('custom')
  expect(bench.timestamp.toMs(200)).toBe(200)
  expect(bench.timestamp.fromMs(300)).toBe(300)

  expect(bench.now()).toBe(100)
})

test('when custom timestamp with internal bigint logic, should still return numbers', () => {
  const bench = new Bench({
    throws: true,
    timestamp: {
      fn: () => 100n,
      fromMs: (ms) => BigInt(ms * 1e6),
      name: 'custom-bigint',
      toMs: (ts) => Number(ts) / 1e6,
    },
  })

  expect(bench.timestamp.fn()).toBe(100n)
  expect(bench.timestamp.name).toBe('custom-bigint')
  expect(bench.timestamp.toMs(200000000n)).toBe(200)
  expect(bench.timestamp.fromMs(300)).toBe(300000000n)
})

test('when custom timestamp with internal bigint logic, should still return numbers', () => {
  const bench = new Bench({
    throws: true,
    timestamp: 'performanceNow',
  })

  expect(bench.timestamp.name).toBe('performanceNow')
  expect(bench.timestamp.toMs(1e6)).toBe(1e6)
  expect(bench.timestamp.fromMs(1e6)).toBe(1e6)
})

test('when custom timestamp with internal bigint logic, should still return numbers', () => {
  const bench = new Bench({
    throws: true,
    timestamp: 'hrtimeNow',
  })

  expect(bench.timestamp.name).toBe('hrtimeNow')
  expect(bench.timestamp.fn()).toBeTypeOf('bigint')
  expect(bench.timestamp.toMs(1_000_000n)).toBe(1)
  expect(bench.timestamp.fromMs(1)).toBe(1_000_000n)
})
