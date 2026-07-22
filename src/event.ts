import type { Task } from './task'
import type {
  BenchEvents,
  BenchEventsOptionalTask,
  BenchEventsWithError,
  BenchEventsWithTask,
  TimerSaturationReason,
} from './types'

/**
 * The BenchEvent class represents events that occur during the benchmarking
 * process.
 */
class BenchEvent<
  K extends BenchEvents = BenchEvents,
  M extends 'bench' | 'task' = 'bench'
> extends globalThis.Event {
  declare type: K

  /**
   * The error associated with the event.
   * @returns The error if the event type is one that includes an error; otherwise, undefined
   */
  get error (): K extends BenchEventsWithError ? Error : undefined {
    return this.#error as K extends BenchEventsWithError ? Error : undefined
  }

  /**
   * The reason a `'warning'` event was dispatched.
   * @returns The {@link TimerSaturationReason} for `'warning'` events;
   *   `undefined` for every other event type and for `'warning'` events
   *   dispatched without a reason
   */
  get reason (): K extends 'warning'
    ? TimerSaturationReason | undefined
    : undefined {
    return this.#reason as K extends 'warning'
      ? TimerSaturationReason | undefined
      : undefined
  }

  /**
   * The task associated with the event.
   * @returns The task if the event type is one that includes a task; otherwise, undefined
   */
  get task (): M extends 'task'
    ? Task
    : K extends BenchEventsWithTask
      ? Task
      : undefined {
    return this.#task as M extends 'task'
      ? Task
      : K extends BenchEventsWithTask
        ? Task
        : undefined
  }

  #error?: Error
  #reason?: TimerSaturationReason
  #task?: Task

  constructor (type: 'warning', task: Task, reason?: TimerSaturationReason)
  constructor (type: BenchEventsWithError, task: Task, error: Error)
  constructor (type: BenchEventsWithTask, task: Task)
  constructor (type: BenchEventsOptionalTask, task?: Task)
  constructor (
    type: BenchEvents,
    task?: Task,
    errorOrReason?: Error | TimerSaturationReason
  ) {
    super(type)
    this.#task = task
    if (typeof errorOrReason === 'string') {
      this.#reason = errorOrReason
    } else {
      this.#error = errorOrReason
    }
  }
}

export { BenchEvent }
