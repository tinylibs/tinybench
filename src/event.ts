import type { Task } from './task'
import type {
  BenchEvents,
  BenchEventsOptionalTask,
  BenchEventsWithError,
  BenchEventsWithTask,
} from './types'

/**
 * The BenchEvent class represents events that occur during the benchmarking
 * process.
 */
class BenchEvent<
  K extends BenchEvents = BenchEvents,
  M extends 'bench' | 'task' = 'bench'
>
  extends globalThis.Event {
  declare type: K

  /**
   * The error associated with the event.
   * @returns The error if the event type is one that includes an error; otherwise, undefined
   */
  get error (): K extends BenchEventsWithError ? Error : undefined {
    return this.#error as K extends BenchEventsWithError ? Error : undefined
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
  #task?: Task

  constructor (type: BenchEventsWithError, task: Task, error: Error)
  constructor (type: BenchEventsWithTask, task: Task)
  constructor (type: BenchEventsOptionalTask, task?: Task)
  constructor (type: BenchEvents, task?: Task, error?: Error) {
    super(type)
    this.#task = task
    this.#error = error
  }
}

export { BenchEvent }
