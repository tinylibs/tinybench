import { expect, test } from 'vitest'

import { detectRuntime } from '../src/utils'

test('detect runtime empty', () => {
  const { runtime, version } = detectRuntime({})

  expect(runtime).toBe('unknown')
  expect(version).toBe('unknown')
})

test('detect runtime bun without version', () => {
  const { runtime, version } = detectRuntime({
    Bun: {}
  })

  expect(runtime).toBe('bun')
  expect(version).toBe('unknown')
})

test('detect runtime bun with version', () => {
  const { runtime, version } = detectRuntime({
    Bun: {
      version: '0.5.0'
    }
  })

  expect(runtime).toBe('bun')
  expect(version).toBe('0.5.0')
})

test('detect runtime node', () => {
  const { runtime, version } = detectRuntime({
    process: {
      release: {
        name: 'node'
      },
      versions: {
        node: '20.4.0'
      }
    }
  })

  expect(runtime).toBe('node')
  expect(version).toBe('20.4.0')
})

test('detect runtime deno', () => {
  const { runtime, version } = detectRuntime({
    Deno: {},
  })

  expect(runtime).toBe('deno')
  expect(version).toBe('unknown')
})

test('detect runtime deno with version', () => {
  const { runtime, version } = detectRuntime({
    Deno: {
      version: { deno: '1.34.3' }
    },
  })

  expect(runtime).toBe('deno')
  expect(version).toBe('1.34.3')
})

test('detect runtime v8 without version', () => {
  const { runtime, version } = detectRuntime({
    d8: {},
  })

  expect(runtime).toBe('v8')
  expect(version).toBe('unknown')
})

test('detect runtime v8', () => {
  const { runtime, version } = detectRuntime({
    d8: {},
    version: () => '1.25.0',
  })

  expect(runtime).toBe('v8')
  expect(version).toBe('1.25.0')
})

test('detect runtime spidermonkey', () => {
  const { runtime, version } = detectRuntime({
    inIon: true,
    performance: {
      mozMemory: {},
    },
  })

  expect(runtime).toBe('spidermonkey')
  expect(version).toBe('unknown')
})

test('detect runtime jsc', () => {
  const { runtime, version } = detectRuntime({
    $: {
      IsHTMLDDA: true,
    },
  })

  expect(runtime).toBe('jsc')
  expect(version).toBe('unknown')
})

test('detect runtime hermes without version', () => {
  const { runtime, version } = detectRuntime({
    HermesInternal: {
      getRuntimeProperties: () => ({}),
    },
  })

  expect(runtime).toBe('hermes')
  expect(version).toBe('unknown')
})

test('detect runtime hermes with version', () => {
  const { runtime, version } = detectRuntime({
    HermesInternal: {
      getRuntimeProperties: () => ({
        'OSS Release Version': '0.11.0',
      }),
    },
  })

  expect(runtime).toBe('hermes')
  expect(version).toBe('0.11.0')
})

test('detect runtime workerd', () => {
  const { runtime, version } = detectRuntime({
    navigator: {
      userAgent: 'Cloudflare-Workers',
    }
  })

  expect(runtime).toBe('workerd')
  expect(version).toBe('unknown')
})

test('detect runtime quickjs-ng', () => {
  const { runtime, version } = detectRuntime({
    navigator: {
      userAgent: 'quickjs-ng',
    }
  })

  expect(runtime).toBe('quickjs-ng')
  expect(version).toBe('unknown')
})

test('detect runtime lagon', () => {
  const { runtime, version } = detectRuntime({
    __lagon__: {}
  })

  expect(runtime).toBe('lagon')
  expect(version).toBe('unknown')
})

// netlify

test('detect runtime netlify', () => {
  const { runtime, version } = detectRuntime({
    Netlify: {}
  })

  expect(runtime).toBe('netlify')
  expect(version).toBe('unknown')
})

test('detect runtime edge-light', () => {
  const { runtime, version } = detectRuntime({
    EdgeRuntime: 'edge-light'
  })

  expect(runtime).toBe('edge-light')
  expect(version).toBe('unknown')
})

test('detect runtime fastly', () => {
  const { runtime, version } = detectRuntime({
    fastly: {}
  })

  expect(runtime).toBe('fastly')
  expect(version).toBe('unknown')
})

test('detect runtime moddable', () => {
  const { runtime, version } = detectRuntime({
    $262: {},
    AsyncDisposableStack: {},
    lockdown: {}
  })

  expect(runtime).toBe('moddable')
  expect(version).toBe('unknown')
})

test('detect runtime browser', () => {
  const { runtime, version } = detectRuntime({
    navigator: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    },
    window: {}
  })

  expect(runtime).toBe('browser')
  expect(version).toBe('unknown')
})
