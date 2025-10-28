import { expect, test } from 'vitest'

import { Bench } from '../src'

test('uses overridden task durations (async)', async () => {
  const bench = new Bench({
    iterations: 16,
    now: () => 100,
    throws: true,
  })

  bench.add('foo', () => {
    return {
      overriddenDuration: bench.opts.now() + 50,
    }
  })

  await bench.run()

  expect(bench.getTask('foo')?.result?.latency.mean).toBe(150)
  expect(bench.getTask('foo')?.result?.latency.min).toBe(150)
  expect(bench.getTask('foo')?.result?.latency.max).toBe(150)
})

test('uses overridden task durations (sync)', () => {
  const bench = new Bench({
    iterations: 16,
    now: () => 100,
    throws: true,
  })

  bench.add('foo', () => {
    return {
      overriddenDuration: bench.opts.now() + 50,
    }
  })

  bench.runSync()

  expect(bench.getTask('foo')?.result?.latency.mean).toBe(150)
  expect(bench.getTask('foo')?.result?.latency.min).toBe(150)
  expect(bench.getTask('foo')?.result?.latency.max).toBe(150)
})
