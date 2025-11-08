import { GetPlatformMetricsOptions, Machine, OS, PlatformMetrics } from './types.js'
import { runtime as jsRuntime, type JSRuntime } from './utils.js'

const loadNodeOS = async (jsRuntime: JSRuntime, g: typeof globalThis = globalThis) => {
  return ['bun', 'deno', 'node'].includes(jsRuntime)
    ? await import('node:os')
    : {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        cpus: typeof g.navigator?.hardwareConcurrency === 'number'
          ? () => {
              return Array
                .from({ length: (g.navigator as unknown as { hardwareConcurrency: number }).hardwareConcurrency })
                .fill({
                  model: 'unknown',
                  speed: -1,
                })
            }
          : () => ([]),
        freemem: () => -1,
        getPriority: () => -1,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        machine: typeof g.navigator?.platform === 'string'
          ? () => normalizeMachine(g.navigator.platform.split(' ')[1])
          : () => 'unknown',
        platform: () => normalizeOSType(g.navigator.platform.split(' ')[0]),
        release: () => 'unknown',
        totalmem: typeof g.navigator.hardwareConcurrency === 'number'
          ? () => g.navigator.hardwareConcurrency
          : () => -1,
      }
}

/* eslint-disable */
const machineLookup: { [key: string]: Machine } = {
  // @ts-ignore __proto__ makes the object null-prototyped and sets it in dictionary mode
  __proto__: null,
  ia32: "x32",
  amd64: "x64",
  x86_64: "x64",
}
/* eslint-enable */

/**
 * @param machine - a value to normalize
 * @returns normalized architecture
 */
export function normalizeMachine (machine?: unknown): Machine {
  return typeof machine !== 'string' || machine.length === 0
    ? 'unknown'
    : ((machine = machine.toLowerCase()) && (machineLookup[machine as Machine] ?? machine)) as Machine
}

const osLookup: Record<Lowercase<string>, OS> = {
  // @ts-expect-error __proto__ makes the object null-prototyped and sets it in dictionary mode
  __proto__: null,
  windows: 'win32',
}

let cachedPlatformMetrics: null | PlatformMetrics = null

/**
 * @param opts - Options object
 * @returns platform metrics
 */
export async function getPlatformMetrics (opts: GetPlatformMetricsOptions = {}): Promise<PlatformMetrics> {
  const {
    g = globalThis,
    runtime = jsRuntime,
    useCache = true
  } = opts
  if (useCache && cachedPlatformMetrics !== null) {
    return cachedPlatformMetrics
  }
  const userAgent = (g as unknown as { navigator?: { userAgent: string } }).navigator?.userAgent ?? ''

  let cpuCores = -1
  let cpuModel = 'unknown'
  let cpuSpeed = -1
  let osKernel = 'unknown'
  let osType: OS = 'unknown'
  let cpuMachine: Machine = 'unknown'
  let priority: null | number = -1
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

    cpuCores = nodeOs.cpus().length
    if (cpuCores > 0) {
      cpuModel = (nodeOs as unknown as { cpus: () => [{ model: string }, ...{ model: string }[]] }).cpus()[0].model
      cpuSpeed = (nodeOs as unknown as { cpus: () => [{ speed: number }, ...{ speed: number }[]] }).cpus()[0].speed
    }
  } catch { /* ignore */ }

  return (cachedPlatformMetrics = {
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
  })
}

/**
 * @param os - a value to normalize
 * @returns normalized OS
 */
export function normalizeOSType (os?: unknown): OS {
  return typeof os !== 'string' || os.length === 0
    ? 'unknown'
    : ((os = os.toLowerCase()) && (osLookup[os as OS] ?? os)) as OS
}
