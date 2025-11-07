import { expect, test } from 'vitest'

import { Bench } from '../src'

test('bench table (async)', async () => {
  const bench = new Bench({ iterations: 32, time: 100 })
  bench.add('foo', async () => {
    await new Promise(resolve => setTimeout(resolve, 1))
  })

  await bench.run()

  const table = bench.table()

  expect(table).toHaveLength(1)

  if (table[0] == null) return

  expect(table[0]['Task name']).toBe('foo')
  if (table[0].Remarks === undefined) return

  expect(table[0].Samples).toBeGreaterThanOrEqual(32)
  expect(table[0]['Latency avg (ns)']).toMatch(/\d+/)
  expect(table[0]['Latency med (ns)']).toMatch(/\d+/)
  expect(table[0]['Throughput avg (ops/s)']).toMatch(/\d+/)
  expect(table[0]['Throughput med (ops/s)']).toMatch(/\d+/)

  bench.remove('foo').add('bar', () => {
    throw new Error('fake')
  })

  await bench.run()

  const errorTable = bench.table()

  expect(errorTable).toHaveLength(1)

  if (errorTable[0] == null) return

  expect(errorTable[0]['Task name']).toBe('bar')
  expect(errorTable[0].Error).toBeTypeOf('string')
  expect(errorTable[0].Stack).toBeTypeOf('string')
})
