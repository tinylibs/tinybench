import { expect, test } from 'vitest'

import { Bench } from '../src'
import { sleep } from './utils'

test('bench task runs and time consistency (sync)', () => {
  const bench = new Bench({ iterations: 32, time: 100 })
  bench.add('foo', () => {
    sleep(50)
  })

  bench.runSync()

  const fooTask = bench.getTask('foo')

  expect(fooTask).toBeDefined()
  if (!fooTask) return

  expect(fooTask.result.state).toBe('completed')
  if (fooTask.result.state !== 'completed') return

  expect(fooTask.runs).toBeGreaterThanOrEqual(bench.iterations)
  expect(fooTask.runs).toBe(fooTask.result.latency.samplesCount)

  expect(fooTask.result.totalTime).toBeGreaterThanOrEqual(bench.time)

  expect(fooTask.result.latency.min).toBeLessThanOrEqual(
    fooTask.result.latency.mean
  )
  expect(fooTask.result.latency.mean).toBeLessThanOrEqual(
    fooTask.result.latency.max
  )
  expect(fooTask.result.latency.min).toBeLessThanOrEqual(
    fooTask.result.latency.p50
  )
  expect(fooTask.result.latency.p50).toBeLessThanOrEqual(
    fooTask.result.latency.max
  )
})
