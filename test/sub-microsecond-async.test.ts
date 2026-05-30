import { expect, test } from 'vitest'

import { Bench } from '../src'

test('sub-microsecond noop qualitative invariants (async)', async () => {
  const bench = new Bench({ iterations: 64, time: 100, warmup: false })
  bench.add('noop', async () => {
    // noop
  })
  await bench.run()

  const fooTask = bench.getTask('noop')
  expect(fooTask).toBeDefined()
  if (!fooTask) return

  expect(fooTask.result.state).toBe('completed')
  if (fooTask.result.state !== 'completed') return

  const { latency } = fooTask.result

  expect(latency.samplesCount).toBeGreaterThan(0)
  expect(latency.samplesCount).toBeGreaterThanOrEqual(bench.iterations)
  expect(fooTask.runs).toBe(latency.samplesCount)

  expect(latency.mean).toBeGreaterThanOrEqual(0)
  expect(latency.min).toBeLessThanOrEqual(latency.mean)
  expect(latency.mean).toBeLessThanOrEqual(latency.max)
  expect(latency.min).toBeLessThanOrEqual(latency.p50)
  expect(latency.p50).toBeLessThanOrEqual(latency.max)

  expect(Number.isFinite(latency.p50)).toBe(true)
  expect(Number.isFinite(latency.p75)).toBe(true)
  expect(Number.isFinite(latency.p99)).toBe(true)
  expect(Number.isFinite(latency.p995)).toBe(true)
  expect(Number.isFinite(latency.p999)).toBe(true)

  expect(latency.sd).toBeGreaterThanOrEqual(0)
  expect(latency.variance).toBeGreaterThanOrEqual(0)
})
