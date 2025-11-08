import { expect, test } from 'vitest'

import { getPlatformMetrics } from '../src/platform'

test('platform metrics', async () => {
  const metrics = await getPlatformMetrics({ useCache: false })
  expect(metrics).toHaveProperty('osType')
  expect(metrics).toHaveProperty('cpuMachine')
})
