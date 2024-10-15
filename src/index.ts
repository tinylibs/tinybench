import Bench from './bench';
import Task from './task';

export type {
  BenchEvent,
  BenchEvents,
  Fn,
  Hook,
  Options,
  TaskEvents,
  TaskResult,
} from './types';

export { hrtimeNow, now } from './utils';

export { Bench, Task };
