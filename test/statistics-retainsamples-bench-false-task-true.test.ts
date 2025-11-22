import { expect, test } from 'vitest'

import { Bench } from '../src'

test('statistics retainSamples false on bench level but retainSamples true on task level', () => {
  const bench = new Bench({ iterations: 32, retainSamples: false, time: 100 })
  bench.add('foo', () => {
    // noop
  }, { retainSamples: true })
  bench.runSync()

  const fooTask = bench.getTask('foo')
  expect(fooTask).toBeDefined()
  if (!fooTask) return

  expect(fooTask.result).toBeDefined()

  expect(fooTask.result.state).toBe('completed')
  if (fooTask.result.state !== 'completed') return

  // latency statistics
  expect(fooTask.result.latency).toBeTypeOf('object')
  expect(fooTask.result.latency.samples).toBeTypeOf('object')
})
