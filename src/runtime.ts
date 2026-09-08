// Portions copyright evanwashere. 2024. All Rights Reserved.
// Portions copyright QuiiBz. 2023-2024. All Rights Reserved.

import type { JSRuntime } from './types'

/**
 * Detects the current JavaScript runtime environment and its version.
 * @param g - the global object
 * @returns the detected runtime and its version
 */
export function detectRuntime (g = globalThis as Record<string, unknown>): {
  runtime: JSRuntime
  version: string
} {
  let runtime: JSRuntime = 'unknown'
  let version = 'unknown'

  if (
    g.Bun ||
    (g.process &&
      (g.process as { versions?: Record<string, string> }).versions?.bun)
  ) {
    runtime = 'bun'
    // `process.versions.bun` can be set without a `Bun` global, e.g. inside a
    // `node:vm` context that was handed the host `process` (vitest's vm pools).
    const bunVersion = (g.Bun as undefined | { version?: string })?.version
    if (bunVersion) {
      version = bunVersion
    } else {
      const processBunVersion = (
        g.process as undefined | { versions?: Record<string, string> }
      )?.versions?.bun
      if (processBunVersion) {
        version = processBunVersion
      }
    }
  } else if (g.Deno) {
    runtime = 'deno'
    version =
      (g.Deno as { version?: { deno: string } }).version?.deno ?? 'unknown'
  } else if (
    g.process &&
    (g.process as { release?: { name: string } }).release?.name === 'node'
  ) {
    runtime = 'node'
    version =
      (g.process as { versions?: { node: string } }).versions?.node ?? 'unknown'
  } else if (g.HermesInternal) {
    runtime = 'hermes'
    version =
      (
        g.HermesInternal as {
          getRuntimeProperties?: () => Record<string, string>
        }
      ).getRuntimeProperties?.()['OSS Release Version'] ?? 'unknown'
  } else if (
    hasNavigatorWithUserAgent(g) &&
    g.navigator.userAgent === 'Cloudflare-Workers'
  ) {
    runtime = 'workerd'
  } else if (
    hasNavigatorWithUserAgent(g) &&
    g.navigator.userAgent.toLowerCase().startsWith('quickjs-ng')
  ) {
    runtime = 'quickjs-ng'
    version = g.navigator.userAgent.split('/')[1] ?? 'unknown'
  } else if (typeof g.Netlify === 'object') {
    runtime = 'netlify'
  } else if (typeof g.EdgeRuntime === 'string') {
    runtime = 'edge-light'
  } else if (g.__lagon__) {
    runtime = 'lagon'
  } else if (g.fastly) {
    runtime = 'fastly'
  } else if (g.$262 && g.lockdown && g.AsyncDisposableStack) {
    runtime = 'moddable'
  } else if (g.d8) {
    runtime = 'v8'
    version =
      typeof g.version === 'function'
        ? (g.version as () => string)()
        : 'unknown'
  } else if (
    g.inIon &&
    g.performance &&
    (g.performance as { mozMemory?: unknown }).mozMemory
  ) {
    runtime = 'spidermonkey'
  } else if (typeof g.$ === 'object' && g.$ !== null && 'IsHTMLDDA' in g.$) {
    runtime = 'jsc'
  } else if (g.window && g.navigator) {
    runtime = 'browser'
  }

  return {
    runtime,
    version,
  }
}

/**
 * Checks whether the global object has a navigator with userAgent.
 * @param g - the global object
 * @returns whether the global object has a navigator with userAgent
 */
function hasNavigatorWithUserAgent (
  g = globalThis as Record<string, unknown>
): g is { navigator: Navigator } {
  return (
    typeof g.navigator === 'object' &&
    g.navigator !== null &&
    typeof (g.navigator as Navigator).userAgent === 'string'
  )
}

export const { runtime, version: runtimeVersion } = detectRuntime()
