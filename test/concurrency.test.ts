import { expect, test } from 'vitest'

import { Bench } from '../src'

test('concurrency error (sync) - concurrency task', () => {
  const bench = new Bench({
    concurrency: 'task',
    throws: true,
  })

  bench.add('foo', () => 1)

  expect(() => {
    bench.runSync()
  }).toThrowError('Cannot use `concurrency` option when using `runSync`')
})

test('concurrency error (sync) - concurrency bench', () => {
  const bench = new Bench({
    concurrency: 'bench',
    throws: true,
  })

  bench.add('foo', () => 1)
})
