import { expect, test } from 'vitest'

import { Bench } from '../src'

test('statistics (sync)', () => {
  const bench = new Bench({ iterations: 32, time: 100 })
  bench.add('foo', () => {
    // noop
  })
  bench.runSync()

  const fooTask = bench.getTask('foo')
  expect(fooTask).toBeDefined()
  if (!fooTask) return

  expect(fooTask.result).toBeDefined()

  expect(fooTask.result.state).toBe('completed')
  if (fooTask.result.state !== 'completed') return

  expect(fooTask.result.runtime).toStrictEqual(bench.runtime)
  expect(fooTask.result.runtimeVersion).toStrictEqual(bench.runtimeVersion)
  expect(fooTask.result.totalTime).toBeTypeOf('number')
  expect(fooTask.result.period).toBeTypeOf('number')
  // latency statistics
  expect(fooTask.result.latency).toBeTypeOf('object')
  expect(fooTask.result.latency.samplesCount).toBeTypeOf('number')
  expect(fooTask.result.latency.min).toBeTypeOf('number')
  expect(fooTask.result.latency.max).toBeTypeOf('number')
  expect(fooTask.result.latency.mean).toBeTypeOf('number')
  expect(fooTask.result.latency.variance).toBeTypeOf('number')
  expect(fooTask.result.latency.sd).toBeTypeOf('number')
  expect(fooTask.result.latency.sem).toBeTypeOf('number')
  expect(fooTask.result.latency.df).toBeTypeOf('number')
  expect(fooTask.result.latency.critical).toBeTypeOf('number')
  expect(fooTask.result.latency.moe).toBeTypeOf('number')
  expect(fooTask.result.latency.rme).toBeTypeOf('number')
  expect(fooTask.result.latency.aad).toBeTypeOf('number')
  expect(fooTask.result.latency.mad).toBeTypeOf('number')
  expect(fooTask.result.latency.p50).toBeTypeOf('number')
  expect(fooTask.result.latency.p75).toBeTypeOf('number')
  expect(fooTask.result.latency.p99).toBeTypeOf('number')
  expect(fooTask.result.latency.p995).toBeTypeOf('number')
  expect(fooTask.result.latency.p999).toBeTypeOf('number')
  // throughput statistics
  expect(fooTask.result.throughput).toBeTypeOf('object')
  expect(fooTask.result.throughput.samplesCount).toBeTypeOf('number')
  expect(fooTask.result.throughput.max).toBeTypeOf('number')
  expect(fooTask.result.throughput.mean).toBeTypeOf('number')
  expect(fooTask.result.throughput.variance).toBeTypeOf('number')
  expect(fooTask.result.throughput.sd).toBeTypeOf('number')
  expect(fooTask.result.throughput.sem).toBeTypeOf('number')
  expect(fooTask.result.throughput.df).toBeTypeOf('number')
  expect(fooTask.result.throughput.critical).toBeTypeOf('number')
  expect(fooTask.result.throughput.moe).toBeTypeOf('number')
  expect(fooTask.result.throughput.rme).toBeTypeOf('number')
  expect(fooTask.result.throughput.aad).toBeTypeOf('number')
  expect(fooTask.result.throughput.mad).toBeTypeOf('number')
  expect(fooTask.result.throughput.p50).toBeTypeOf('number')
  expect(fooTask.result.throughput.p75).toBeTypeOf('number')
  expect(fooTask.result.throughput.p99).toBeTypeOf('number')
  expect(fooTask.result.throughput.p995).toBeTypeOf('number')
  expect(fooTask.result.throughput.p999).toBeTypeOf('number')
})
