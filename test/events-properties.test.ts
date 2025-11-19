import { test } from 'vitest'

import { Bench, type Task } from '../src'

/**
 * This helper function is used to assert that a value is assignable to a specific type.
 * It does not produce any runtime code and is only used for type checking during development.
 * @param value - The value to be checked for type assignability.
 * @returns The same value that was passed in.
 */
function expectAssignable<T> (value: T) {
  return value
}

test('events properties', () => {
  const bench = new Bench()

  const fooTask = bench.getTask('foo')

  if (!fooTask) return

  // Task events

  fooTask.addEventListener('abort', evt => {
    expectAssignable<Task>(evt.task)
    expectAssignable<undefined>(evt.error)
  })

  fooTask.addEventListener('complete', evt => {
    expectAssignable<Task>(evt.task)
    expectAssignable<undefined>(evt.error)
  })

  fooTask.addEventListener('cycle', evt => {
    expectAssignable<Task>(evt.task)
    expectAssignable<undefined>(evt.error)
  })

  fooTask.addEventListener('error', evt => {
    expectAssignable<Task>(evt.task)
    expectAssignable<Error>(evt.error)
  })

  fooTask.addEventListener('reset', evt => {
    expectAssignable<Task>(evt.task)
    expectAssignable<undefined>(evt.error)
  })

  fooTask.addEventListener('start', evt => {
    expectAssignable<Task>(evt.task)
    expectAssignable<undefined>(evt.error)
  })

  fooTask.addEventListener('warmup', evt => {
    expectAssignable<Task>(evt.task)
    expectAssignable<undefined>(evt.error)
  })

  // Bench events

  bench.addEventListener('abort', evt => {
    expectAssignable<Task | undefined>(evt.task)
    expectAssignable<undefined>(evt.error)
  })

  bench.addEventListener('add', evt => {
    expectAssignable<Task>(evt.task)
    expectAssignable<undefined>(evt.error)
  })

  bench.addEventListener('complete', evt => {
    expectAssignable<undefined>(evt.task)
    expectAssignable<undefined>(evt.error)
  })

  bench.addEventListener('cycle', evt => {
    expectAssignable<Task>(evt.task)
    expectAssignable<undefined>(evt.error)
  })

  bench.addEventListener('error', evt => {
    expectAssignable<Task>(evt.task)
    expectAssignable<Error>(evt.error)
  })

  bench.addEventListener('remove', evt => {
    expectAssignable<Task>(evt.task)
    expectAssignable<undefined>(evt.error)
  })

  bench.addEventListener('reset', evt => {
    expectAssignable<undefined>(evt.task)
    expectAssignable<undefined>(evt.error)
  })

  bench.addEventListener('start', evt => {
    expectAssignable<undefined>(evt.task)
    expectAssignable<undefined>(evt.error)
  })

  bench.addEventListener('warmup', evt => {
    expectAssignable<undefined>(evt.task)
    expectAssignable<undefined>(evt.error)
  })
})
