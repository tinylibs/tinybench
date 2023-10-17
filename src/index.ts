import Bench from './bench';
import Task from './task';

export type {
  Fn,
  TaskResult,
  BenchEvents,
  Options,
  Hook,
  TaskEvents,
  BenchEvent,
} from './types';

export { now, hrtimeNow } from './utils';

export { Bench, Task };
export default Bench;
