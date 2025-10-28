import { platform } from 'node:os'
import { expect, test } from 'vitest'

import { Bench, hrtimeNow, now } from '../src'

test.each([
  ['now()', now],
  ['hrtimeNow()', hrtimeNow],
])('%s basic (async)', {  timeout: 10000, skip: platform() !== 'linux' }, async (_, _now) => {
  const bench = new Bench({ iterations: 16, now: _now, time: 100 })
  bench
    .add('foo', async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })
    .add('bar', async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

  await bench.run()

  const { tasks } = bench

  expect(tasks.length).toEqual(2)

  expect(tasks[0]?.name).toEqual('foo')
  expect(tasks[0]?.result?.totalTime).toBeGreaterThan(50)
  expect(tasks[0]?.result?.latency.mean).toBeGreaterThan(50)
  // throughput mean is ops/s, period is ms unit value
  expect(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    tasks[0]!.result!.throughput.mean * tasks[0]!.result!.period
  ).toBeCloseTo(1000, 1)

  expect(tasks[1]?.name).toEqual('bar')
  expect(tasks[1]?.result?.totalTime).toBeGreaterThan(100)
  expect(tasks[1]?.result?.latency.mean).toBeGreaterThan(100)
  // throughput mean is ops/s, period is ms unit value
  expect(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    tasks[1]!.result!.throughput.mean * tasks[1]!.result!.period
  ).toBeCloseTo(1000, 1)
})
