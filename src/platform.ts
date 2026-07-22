import type { GetPlatformMetricsOptions, JSRuntime, Machine, OS, PlatformMetrics } from './types.js'

import { runtime as jsRuntime } from './utils.js'

const loadNodeOS = async (jsRuntime: JSRuntime, g: typeof globalThis = globalThis) => {
  return ['bun', 'deno', 'node'].includes(jsRuntime)
    ? await import('node:os')
    : {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        cpus: typeof g.navigator?.hardwareConcurrency === 'number'
          ? () => {
              return Array
                .from(
                  { length: (g.navigator as unknown as { hardwareConcurrency: number }).hardwareConcurrency },
                  () => ({ model: 'unknown', speed: -1 })
                )
            }
          : () => ([]),
        freemem: () => -1,
        getPriority: (): null | number => null,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        machine: typeof g.navigator?.platform === 'string'
          ? () => g.navigator.platform.split(' ')[1] ?? 'unknown'
          : () => 'unknown',
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        platform: typeof g.navigator?.platform === 'string'
          ? () => browserOSType(g.navigator.platform)
          : () => 'unknown',
        release: () => 'unknown',
        totalmem: typeof (g as unknown as { navigator?: { deviceMemory: number } }).navigator?.deviceMemory === 'number'
          ? () => (g as unknown as { navigator: { deviceMemory: number } }).navigator.deviceMemory * 2 ** 30
          : () => -1,
      }
}

const machineLookup: Record<Lowercase<string>, Machine> = {
  // @ts-expect-error __proto__ makes the object null-prototyped and sets it in dictionary mode
  __proto__: null,
  aarch64: 'arm64',
  amd64: 'x64',
  i386: 'ia32',
  i686: 'ia32',
  x86: 'ia32',
  x86_64: 'x64',
}

/**
 * Normalizes a raw CPU architecture token (e.g. from `os.machine()` or a
 * browser `navigator.platform`) to a canonical `process.arch`-style value.
 * Known uname aliases are mapped (`x86_64`/`amd64` → `x64`, `aarch64` → `arm64`,
 * `i686`/`i386`/`x86` → `ia32`); unknown tokens are lowercased and returned
 * as-is, and non-string/empty input yields `'unknown'`.
 * @param machine - a value to normalize
 * @returns normalized architecture
 */
export function normalizeMachine (machine?: unknown): Machine {
  if (typeof machine !== 'string' || machine.length === 0) {
    return 'unknown'
  }
  const key = machine.toLowerCase()
  return machineLookup[key as Lowercase<string>] ?? (key as Machine)
}

const osLookup: Record<Lowercase<string>, OS> = {
  // @ts-expect-error __proto__ makes the object null-prototyped and sets it in dictionary mode
  __proto__: null,
  windows: 'win32',
}

/**
 * Normalizes a raw OS token (e.g. from `os.platform()` or {@link browserOSType})
 * to a canonical value; `windows` is mapped to `win32`, unknown tokens are
 * lowercased and returned as-is, and non-string/empty input yields `'unknown'`.
 * @param os - a value to normalize
 * @returns normalized OS
 */
export function normalizeOSType (os?: unknown): OS {
  if (typeof os !== 'string' || os.length === 0) {
    return 'unknown'
  }
  const key = os.toLowerCase()
  return osLookup[key as Lowercase<string>] ?? (key as OS)
}

/**
 * Maps a (deprecated) `navigator.platform` value to a canonical OS token.
 * `navigator.platform` is the only synchronous, broadly-available signal;
 * space-less values (e.g. `'MacIntel'`, `'Win32'`) encode the OS in a prefix,
 * which this resolves. Apple platforms (Mac/iPhone/iPad/iPod) are Darwin-based.
 * @param platform - the `navigator.platform` string
 * @returns normalized OS
 */
function browserOSType (platform: string): OS {
  const value = platform.toLowerCase()
  if (
    value.startsWith('mac') ||
    value.startsWith('iphone') ||
    value.startsWith('ipad') ||
    value.startsWith('ipod')
  ) {
    return 'darwin'
  }
  if (value.startsWith('win')) {
    return 'win32'
  }
  if (value.startsWith('android')) {
    return 'android'
  }
  if (value.startsWith('linux')) {
    return 'linux'
  }
  return normalizeOSType(platform)
}

let cachedPlatformMetrics: null | PlatformMetrics = null

/**
 * Collects a best-effort snapshot of the host platform (CPU, memory, OS,
 * runtime). Node-like runtimes (`bun`/`deno`/`node`) use `node:os`; other
 * runtimes fall back to `navigator` (`hardwareConcurrency`/`deviceMemory`/
 * `platform`). Unavailable fields use sentinels: `-1` for numbers,
 * `'unknown'` for strings, and `null` for `priority`.
 *
 * The result for the default environment (`g === globalThis` and the
 * auto-detected `runtime`) is memoized when `useCache` is `true`; pass
 * `useCache: false` to force recomputation. Calls with a custom `g` or
 * `runtime` bypass the cache entirely — they never read nor write it.
 * @param opts - options; see {@link GetPlatformMetricsOptions}
 * @returns the platform metrics
 */
export async function getPlatformMetrics (opts: GetPlatformMetricsOptions = {}): Promise<PlatformMetrics> {
  const {
    g = globalThis,
    runtime = jsRuntime,
    useCache = true
  } = opts
  const cacheable = useCache && g === globalThis && runtime === jsRuntime
  if (cacheable && cachedPlatformMetrics !== null) {
    return cachedPlatformMetrics
  }
  const userAgent = (g as unknown as { navigator?: { userAgent: string } }).navigator?.userAgent ?? ''

  let cpuCores = -1
  let cpuModel = 'unknown'
  let cpuSpeed = -1
  let osKernel = 'unknown'
  let osType: OS = 'unknown'
  let cpuMachine: Machine = 'unknown'
  let priority: null | number = null
  let memoryTotal = -1
  let memoryFree = -1

  const nodeOs = await loadNodeOS(runtime, g)

  try {
    osType = normalizeOSType(nodeOs.platform())
    cpuMachine = normalizeMachine(nodeOs.machine())
    osKernel = nodeOs.release()
    memoryTotal = nodeOs.totalmem()
    memoryFree = nodeOs.freemem()
    priority = nodeOs.getPriority()

    const cpus = nodeOs.cpus()
    cpuCores = cpus.length
    const firstCpu = cpus[0]
    if (firstCpu) {
      cpuModel = firstCpu.model
      cpuSpeed = firstCpu.speed
    }
  } catch {
    // Best-effort: node:os can throw in restricted sandboxes; unresolved
    // fields keep their sentinel defaults (-1 / 'unknown' / null).
  }

  const metrics: PlatformMetrics = {
    cpuCores,
    cpuMachine,
    cpuModel,
    cpuSpeed,
    memoryFree,
    memoryTotal,
    osKernel,
    osType,
    priority,
    runtime,
    userAgent
  }
  if (cacheable) {
    cachedPlatformMetrics = metrics
  }
  return metrics
}
