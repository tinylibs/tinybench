import { expect, test } from 'vitest'

import { Bench } from '../src'
import { sleep } from './utils'

test('detect faster task (sync)', () => {
  const bench = new Bench({ iterations: 10, time: 100 })
  bench
    .add('faster', () => {
      sleep(25)
    })
    .add('slower', () => {
      sleep(50)
    })

  bench.runSync()

  const fasterTask = bench.getTask('faster')
  const slowerTask = bench.getTask('slower')

  expect(fasterTask).toBeDefined()
  if (!fasterTask) return

  expect(slowerTask).toBeDefined()
  if (!slowerTask) return

  expect(fasterTask.result.state).toBe('completed')
  if (fasterTask.result.state !== 'completed') return

  expect(slowerTask.result.state).toBe('completed')
  if (slowerTask.result.state !== 'completed') return

  expect(fasterTask.result.latency.mean).toBeLessThan(
    slowerTask.result.latency.mean
  )
  expect(fasterTask.result.latency.min).toBeLessThan(
    slowerTask.result.latency.min
  )
  expect(fasterTask.result.latency.max).toBeLessThan(
    slowerTask.result.latency.max
  )
  // latency moe should be lesser since it's faster
  expect(fasterTask.result.latency.moe).toBeLessThan(
    slowerTask.result.latency.moe
  )

  expect(fasterTask.result.throughput.mean).toBeGreaterThan(
    slowerTask.result.throughput.mean
  )
  expect(fasterTask.result.throughput.min).toBeGreaterThan(
    slowerTask.result.throughput.min
  )
  expect(fasterTask.result.throughput.max).toBeGreaterThan(
    slowerTask.result.throughput.max
  )
  // throughput moe should be greater since it's faster
  expect(fasterTask.result.throughput.moe).toBeGreaterThan(
    slowerTask.result.throughput.moe
  )
})
