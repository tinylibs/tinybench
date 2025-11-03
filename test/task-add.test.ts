import { expect, test } from 'vitest'

import { Bench } from '../src'

test('task add duplicate error', () => {
  const bench = new Bench()
  bench.add('foo', () => {
    /* noop */
  })
  expect(() =>
    bench.add('foo', () => {
      /* noop */
    })
  ).toThrowError('Task "foo" already exists')
})
