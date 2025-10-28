import { expect, test } from 'vitest'

import { Bench } from '../src'

test('using concurrency should throw (sync)', () => {
  const bench = new Bench({
    throws: true,
  })

  bench.add('foo', () => 1)

  bench.concurrency = 'task'

  expect(() => {
    bench.runSync()
  }).toThrowError('Cannot use `concurrency` option when using `runSync`')

  bench.concurrency = 'bench'

  expect(() => {
    bench.runSync()
  }).toThrowError('Cannot use `concurrency` option when using `runSync`')
})
