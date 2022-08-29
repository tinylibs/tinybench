export type {
  Fn,
  TaskResult,
  BenchEvents,
  Options,
  Hook,
  TaskEvents,
  BenchEvent,
} from "../types";
import Bench from "./bench";
import Task from "./task";

export { now } from "./utils";

export { Bench, Task };
export default Bench;
