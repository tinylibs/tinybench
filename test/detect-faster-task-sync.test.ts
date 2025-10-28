import { platform } from 'node:os'
import { expect, test } from 'vitest'

import { Bench } from '../src'

/**
 * @param ms amount of time to sleep in milliseconds
 */
function sleep (ms: number): void {
  const start = performance.now()
  while (performance.now() - start < ms) {
    // noop
  }
}

test('detect faster task (sync)', { skip: platform() !== 'linux', timeout: 10000 }, () => {
  const bench = new Bench({ iterations: 32, time: 100 })
  bench
    .add('faster', () => {
      // noop
    })
    .add('slower', () => {
      sleep(50)
    })

  bench.runSync()

  const fasterTask = bench.getTask('faster')
  const slowerTask = bench.getTask('slower')

  expect(fasterTask?.result?.latency.mean).toBeLessThan(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    slowerTask!.result!.latency.mean
  )
  expect(fasterTask?.result?.latency.min).toBeLessThan(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    slowerTask!.result!.latency.min
  )
  expect(fasterTask?.result?.latency.max).toBeLessThan(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    slowerTask!.result!.latency.max
  )
  // latency moe should be lesser since it's faster
  expect(fasterTask?.result?.latency.moe).toBeLessThan(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    slowerTask!.result!.latency.moe
  )

  expect(fasterTask?.result?.throughput.mean).toBeGreaterThan(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    slowerTask!.result!.throughput.mean
  )
  expect(fasterTask?.result?.throughput.min).toBeGreaterThan(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    slowerTask!.result!.throughput.min
  )
  expect(fasterTask?.result?.throughput.max).toBeGreaterThan(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    slowerTask!.result!.throughput.max
  )
  // throughput moe should be greater since it's faster
  expect(fasterTask?.result?.throughput.moe).toBeGreaterThan(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    slowerTask!.result!.throughput.moe
  )
})
