import { expect, test } from 'vitest'

import { Bench } from '../src'

test('bench task runs and time consistency (async)', async () => {
  const bench = new Bench({ iterations: 32, time: 100 })
  bench.add('foo', async () => {
    await new Promise(resolve => setTimeout(resolve, 50))
  })

  await bench.run()

  const fooTask = bench.getTask('foo')

  expect(fooTask).toBeDefined()
  if (!fooTask) return

  expect(fooTask.result.state).toBe('completed')
  if (fooTask.result.state !== 'completed') return

  expect(fooTask.runs).toBeGreaterThanOrEqual(bench.iterations)

  expect(fooTask.result.totalTime).toBeGreaterThanOrEqual(bench.time)
})
