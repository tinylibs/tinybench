import type Task from './task';
import type { BenchEvents } from './types';

const createBenchEvent = (eventType: BenchEvents, target?: Task) => {
  const event = new Event(eventType);
  if (target) {
    Object.defineProperty(event, 'task', {
      value: target,
      enumerable: true,
      writable: false,
      configurable: false,
    });
  }
  return event;
};

const createErrorEvent = (target: Task, error: Error) => {
  const event = new Event('error');
  Object.defineProperty(event, 'task', {
    value: target,
    enumerable: true,
    writable: false,
    configurable: false,
  });
  Object.defineProperty(event, 'error', {
    value: error,
    enumerable: true,
    writable: false,
    configurable: false,
  });
  return event;
};

export { createBenchEvent, createErrorEvent };
