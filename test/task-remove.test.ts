import { expect, test } from 'vitest'

import { Bench } from '../src'

test('task remove non-existing', () => {
  const bench = new Bench()
  bench.addEventListener('remove', () => {
    expect.unreachable()
  })

  bench.remove('non-existent')
})
