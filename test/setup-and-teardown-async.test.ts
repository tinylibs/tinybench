import { expect, test, vi } from 'vitest'

import { Bench } from '../src'

test('setup and teardown (async)', async () => {
  const calls: string[] = []
  const setup = vi.fn(() => {
    calls.push('setup')
  })
  const teardown = vi.fn(() => {
    calls.push('teardown')
  })
  const bench = new Bench({
    iterations: 32,
    setup,
    teardown,
    time: 100,
  })
  bench.add('foo', async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })
  const fooTask = bench.getTask('foo')

  await bench.run()

  expect(setup).toBeCalledWith(fooTask, 'warmup')
  expect(setup).toBeCalledWith(fooTask, 'run')
  expect(setup).toHaveBeenCalledTimes(2)
  expect(teardown).toBeCalledWith(fooTask, 'warmup')
  expect(teardown).toBeCalledWith(fooTask, 'run')
  expect(teardown).toHaveBeenCalledTimes(2)
  expect(calls).toStrictEqual(['setup', 'teardown', 'setup', 'teardown'])
})
