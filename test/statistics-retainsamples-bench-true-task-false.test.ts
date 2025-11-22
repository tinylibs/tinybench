import { expect, test } from 'vitest'

import { Bench } from '../src'

test('statistics retainSamples true on bench level but retainSamples false on task level', () => {
  const bench = new Bench({ iterations: 32, retainSamples: true, time: 100 })
  bench.add('foo', () => {
    // noop
  }, { retainSamples: false })
  bench.runSync()

  const fooTask = bench.getTask('foo')
  expect(fooTask).toBeDefined()
  if (!fooTask) return

  expect(fooTask.result).toBeDefined()

  expect(fooTask.result.state).toBe('completed')
  if (fooTask.result.state !== 'completed') return

  // latency statistics
  expect(fooTask.result.latency).toBeTypeOf('object')
  expect(fooTask.result.latency.samples).toBeTypeOf('undefined')
})
