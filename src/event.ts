import type { Task } from './task'
import type { BenchEvents, BenchEventsOptionalTask, BenchEventsWithError, BenchEventsWithTask } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface BenchEvent<K extends BenchEvents=BenchEvents, M extends 'bench' | 'task' = 'bench'> extends globalThis.Event {
  readonly type: K;
}

class BenchEvent<K extends BenchEvents=BenchEvents, M extends 'bench' | 'task' = 'bench'> extends globalThis.Event {
  get error (): K extends BenchEventsWithError ? Error : undefined {
    return this.#error as K extends BenchEventsWithError ? Error : undefined
  }

  get task (): M extends 'task' ? Task : K extends BenchEventsWithTask ? Task : undefined {
    return this.#task as M extends 'task' ? Task : K extends BenchEventsWithTask ? Task : undefined
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
