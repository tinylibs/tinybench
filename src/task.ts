import { Fn, TaskResult } from "./types";

export class Task extends EventTarget {
  name: string;
  fn: Fn;
  runs: number = 0;
  result?: TaskResult;

  constructor(name: string, fn: Fn) {
    super();
    this.name = name;
    this.fn = fn;
  }

  setResult(result: Partial<TaskResult>) {
    this.result = { ...this.result, ...result } as TaskResult;
  }

  reset() {
    this.runs = 0;
    this.result = undefined;
  }
}
