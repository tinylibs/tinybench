import { expect, test } from 'vitest'

import { getPlatformMetrics } from '../src/platform'

test('platform metrics', async () => {
  const metrics = await getPlatformMetrics({ useCache: false })
  expect(metrics).toHaveProperty('osType')
  expect(metrics).toHaveProperty('cpuMachine')
})

test('browser OS/arch detection from navigator.platform', async () => {
  const g = {
    navigator: {
      hardwareConcurrency: 4,
      platform: 'Linux x86_64',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)'
    }
  } as unknown as typeof globalThis
  const metrics = await getPlatformMetrics({ g, runtime: 'browser', useCache: false })
  expect(metrics.runtime).toBe('browser')
  expect(metrics.osType).toBe('linux')
  expect(metrics.cpuMachine).toBe('x64')
  expect(metrics.cpuCores).toBe(4)
  expect(metrics.userAgent).toBe('Mozilla/5.0 (X11; Linux x86_64)')
})

test('browser macOS platform maps to darwin', async () => {
  const g = {
    navigator: { hardwareConcurrency: 8, platform: 'MacIntel', userAgent: 'mac-ua' }
  } as unknown as typeof globalThis
  const metrics = await getPlatformMetrics({ g, runtime: 'browser', useCache: false })
  expect(metrics.osType).toBe('darwin')
  expect(metrics.cpuMachine).toBe('unknown')
})

test('browser Android is detected from the user agent, not navigator.platform', async () => {
  const g = {
    navigator: {
      hardwareConcurrency: 8,
      platform: 'Linux armv8l',
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)'
    }
  } as unknown as typeof globalThis
  const metrics = await getPlatformMetrics({ g, runtime: 'browser', useCache: false })
  expect(metrics.osType).toBe('android')
  expect(metrics.cpuMachine).toBe('arm')
})

test('browser desktop Linux stays linux', async () => {
  const g = {
    navigator: {
      hardwareConcurrency: 8,
      platform: 'Linux armv8l',
      userAgent: 'Mozilla/5.0 (X11; Linux)'
    }
  } as unknown as typeof globalThis
  const metrics = await getPlatformMetrics({ g, runtime: 'browser', useCache: false })
  expect(metrics.osType).toBe('linux')
  expect(metrics.cpuMachine).toBe('arm')
})

test('custom g/runtime never poison the default cache', async () => {
  const g = {
    navigator: { hardwareConcurrency: 2, platform: 'Win32', userAgent: 'fake' }
  } as unknown as typeof globalThis
  const fake = await getPlatformMetrics({ g, runtime: 'browser', useCache: false })
  expect(fake.runtime).toBe('browser')
  const real = await getPlatformMetrics()
  expect(real.runtime).not.toBe('browser')
})
