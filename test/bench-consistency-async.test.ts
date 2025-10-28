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

test('bench task runs and time consistency (async)', async () => {
  const bench = new Bench({ iterations: 32, time: 100 })
  bench.add('foo', async () => {
    await new Promise(resolve => setTimeout(resolve, 50))
  })

  await bench.run()

  const fooTask = bench.getTask('foo')

  expect(fooTask?.runs).toBeGreaterThanOrEqual(bench.opts.iterations)

  expect(fooTask?.result?.totalTime).toBeGreaterThanOrEqual(bench.opts.time)
})
