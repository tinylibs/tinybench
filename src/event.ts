import Task from './task';
import { BenchEvents } from './types';

export type BenchEvent = Event & {
  task: Task | null;
};

export function createBenchEvent(
  eventType: BenchEvents,
  target: Task | null = null,
) {
  const event = new Event(eventType);
  Object.defineProperty(event, 'task', {
    value: target,
    enumerable: true,
    writable: false,
    configurable: false,
  });
  return event;
}
