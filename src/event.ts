import type { BenchEvents } from '../types';
import Task from './task';

function createBenchEvent(
  eventType: BenchEvents,
  target: Task | null = null,
) {
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
}

export default createBenchEvent;
export {
  createBenchEvent,
};
