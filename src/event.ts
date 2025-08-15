import type { Task } from './task'
import type { BenchEvents } from './types'

const createBenchEvent = (eventType: BenchEvents, target?: Task) => {
  const event = new globalThis.Event(eventType)
  if (target) {
    Object.defineProperty(event, 'task', {
      configurable: false,
      enumerable: false,
      value: target,
      writable: false,
    })
  }
  return event
}

const createErrorEvent = (target: Task, error: Error) => {
  const event = new globalThis.Event('error')
  Object.defineProperty(event, 'task', {
    configurable: false,
    enumerable: false,
    value: target,
    writable: false,
  })
  Object.defineProperty(event, 'error', {
    configurable: false,
    enumerable: false,
    value: error,
    writable: false,
  })
  return event
}

export { createBenchEvent, createErrorEvent }
