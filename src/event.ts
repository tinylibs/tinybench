import { Task } from "./task";
import { Events } from "./types";

export class BenchEvent extends Event {
  constructor(event: Events, target: Task) {
    super(event);
    const obj: BenchEvent = { ...this, currentTarget: target, target };
    Object.setPrototypeOf(obj, this);
    return obj;
  }
}
