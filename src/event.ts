import Task from "./task";

export function createBenchEvent(
  eventType: IBenchEvents,
  target: Task | null = null
) {
  const event = new Event(eventType);
  Object.defineProperty(event, "task", {
    value: target,
    enumerable: true,
    writable: false,
    configurable: false,
  });
  return event;
}
