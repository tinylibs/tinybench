import { expect, test } from 'vitest'

import { Bench, type Hook, type Task } from '../src'

test('setup and teardown (async)', async () => {
  const calls: string[] = []
  const setupCalls: [Task | undefined, string | undefined][] = []
  const teardownCalls: [Task | undefined, string | undefined][] = []
  const setup: Hook = (task, event) => {
    setupCalls.push([task, event])
    calls.push('setup')
  }
  const teardown: Hook = (task, event) => {
    teardownCalls.push([task, event])
    calls.push('teardown')
  }
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

  expect(setupCalls.length).toBe(2)
  expect(setupCalls[0]![0]).toBe(fooTask) // eslint-disable-line @typescript-eslint/no-non-null-assertion
  expect(setupCalls[0]![1]).toBe('warmup') // eslint-disable-line @typescript-eslint/no-non-null-assertion
  expect(setupCalls[1]![0]).toBe(fooTask) // eslint-disable-line @typescript-eslint/no-non-null-assertion
  expect(setupCalls[1]![1]).toBe('run') // eslint-disable-line @typescript-eslint/no-non-null-assertion

  expect(teardownCalls.length).toBe(2)
  expect(teardownCalls[0]![0]).toBe(fooTask) // eslint-disable-line @typescript-eslint/no-non-null-assertion
  expect(teardownCalls[0]![1]).toBe('warmup') // eslint-disable-line @typescript-eslint/no-non-null-assertion
  expect(teardownCalls[1]![0]).toBe(fooTask) // eslint-disable-line @typescript-eslint/no-non-null-assertion
  expect(teardownCalls[1]![1]).toBe('run') // eslint-disable-line @typescript-eslint/no-non-null-assertion

  expect(calls).toStrictEqual(['setup', 'teardown', 'setup', 'teardown'])
})
