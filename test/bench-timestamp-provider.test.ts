import { expect, test } from 'vitest'

import { Bench } from '../src'

test('by default should use performanceNow as timestamp provider', () => {
  const bench = new Bench()
  expect(bench.timestampProvider.name).toBe('performanceNow')
})

test('should throw an error if timestampProvider and now are provided as options', () => {
  expect(
    () =>
      new Bench({
        now: () => 100,
        throws: true,
        timestampProvider: {
          fn: () => 100,
          fromMs: ms => ms,
          name: 'custom',
          toMs: ts => ts as number,
        },
      })
  ).toThrowError('Cannot set both `now` and `timestampProvider` options')
})

test('should convert now function to custom timestampProvider', () => {
  const bench = new Bench({
    now: () => 100,
    throws: true,
  })

  expect(bench.timestampProvider.fn()).toBe(100)
  expect(bench.timestampProvider.name).toBe('custom')
  expect(bench.timestampProvider.toMs(200)).toBe(200)
  expect(bench.timestampProvider.fromMs(300)).toBe(300)

  expect(bench.now()).toBe(100)
})

test('when custom timestamp with internal bigint logic, should still return numbers', () => {
  const bench = new Bench({
    throws: true,
    timestampProvider: {
      fn: () => 100n,
      fromMs: ms => BigInt(ms * 1e6),
      name: 'custom-bigint',
      toMs: ts => Number(ts) / 1e6,
    },
  })

  expect(bench.timestampProvider.fn()).toBe(100n)
  expect(bench.timestampProvider.name).toBe('custom-bigint')
  expect(bench.timestampProvider.toMs(200000000n)).toBe(200)
  expect(bench.timestampProvider.fromMs(300)).toBe(300000000n)
})

test('verify performanceNow', () => {
  const bench = new Bench({
    throws: true,
    timestampProvider: 'performanceNow',
  })

  expect(bench.timestampProvider.name).toBe('performanceNow')
  expect(bench.timestampProvider.toMs(1e6)).toBe(1e6)
  expect(bench.timestampProvider.fromMs(1e6)).toBe(1e6)
})

test('verify hrtimeNow', () => {
  const bench = new Bench({
    throws: true,
    timestampProvider: 'hrtimeNow',
  })

  expect(bench.timestampProvider.name).toBe('hrtimeNow')
  expect(bench.timestampProvider.fn()).toBeTypeOf('bigint')
  expect(bench.timestampProvider.toMs(1_000_000n)).toBe(1)
  expect(bench.timestampProvider.fromMs(1)).toBe(1_000_000n)
})

test('create dateNow like example', () => {
  const bench = new Bench({
    throws: true,
    timestampProvider: {
      fn: () => Date.now(),
      fromMs: ms => ms,
      name: 'dateNow',
      toMs: ts => ts as number,
    },
  })

  expect(bench.timestampProvider.name).toBe('dateNow')
  expect(bench.timestampProvider.fn()).toBeTypeOf('number')
  expect(bench.timestampProvider.toMs(1)).toBe(1)
  expect(bench.timestampProvider.fromMs(1)).toBe(1)
})
