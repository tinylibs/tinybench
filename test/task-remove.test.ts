import { expect, test } from 'vitest'

import { Bench } from '../src'

test('removing non-existing task should not throw', () => {
  const bench = new Bench()
  bench.addEventListener('remove', () => {
    expect.unreachable()
  })

  bench.remove('non-existent')
})
