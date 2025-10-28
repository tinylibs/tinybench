import { expect, test } from 'vitest'

import { Bench } from '../src'

test('bench table (sync)', () => {
  const bench = new Bench({ iterations: 32, time: 100 })
  bench.add('foo', () => {
    // noop
  })

  bench.runSync()

  expect(bench.table()).toStrictEqual([
    /* eslint-disable perfectionist/sort-objects */
    {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      'Task name': expect.any(String),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      'Latency avg (ns)': expect.any(String),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      'Latency med (ns)': expect.any(String),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      'Throughput avg (ops/s)': expect.any(String),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      'Throughput med (ops/s)': expect.any(String),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      Samples: expect.any(Number),
    },
    /* eslint-enable perfectionist/sort-objects */
  ])

  bench.remove('foo').add('bar', () => {
    throw new Error('fake')
  })

  bench.runSync()

  expect(bench.table()).toStrictEqual([
    /* eslint-disable perfectionist/sort-objects */
    {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      'Task name': expect.any(String),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      Error: expect.any(String),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      Stack: expect.any(String),
    },
    /* eslint-enable perfectionist/sort-objects */
  ])
})
