import type { Task } from './task'
import type { BenchEvents } from './types'

const createBenchEvent = (eventType: BenchEvents, target?: Task) => {
  const event = new Event(eventType)
  if (target) {
    Object.defineProperty(event, 'task', {
      configurable: false,
      enumerable: true,
      value: target,
      writable: false,
    })
  }
  return event
}

const createErrorEvent = (target: Task, error: Error) => {
  const event = new Event('error')
  Object.defineProperty(event, 'task', {
    configurable: false,
    enumerable: true,
    value: target,
    writable: false,
  })
  Object.defineProperty(event, 'error', {
    configurable: false,
    enumerable: true,
    value: error,
    writable: false,
  })
  return event
}

export { createBenchEvent, createErrorEvent }
