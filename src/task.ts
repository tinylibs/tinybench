import { Fn, TaskResult } from "./types";

export class Task extends EventTarget {
  fn: Fn;
  runs: number = 0;
  result?: TaskResult;

  constructor(fn: Fn) {
    super();
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
