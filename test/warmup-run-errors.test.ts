import { expect, test } from 'vitest'

import { Bench, type Task } from '../src'

test.each(['warmup', 'run'])('%s error event (async)', async mode => {
  const bench = new Bench({
    iterations: 32,
    time: 100,
    warmup: mode === 'warmup',
  })
  const error = new Error()

  bench.add('error', () => {
    throw error
  })

  let err: Error | undefined
  let task: Task | undefined
  bench.addEventListener('error', evt => {
    const { error: e, task: t } = evt
    err = e
    task = t
  })

  await expect(bench.run()).resolves.toBeDefined()
  expect(err).toStrictEqual(error)
  expect(task?.result?.error).toStrictEqual(error)
})

test.each(['warmup', 'run'])('%s error event (sync)', mode => {
  const bench = new Bench({
    iterations: 32,
    time: 100,
    warmup: mode === 'warmup',
  })
  const error = new Error()

  bench.add('error', () => {
    throw error
  })

  let err: Error | undefined
  let task: Task | undefined
  bench.addEventListener('error', evt => {
    const { error: e, task: t } = evt
    err = e
    task = t
  })

  expect(bench.runSync()).toBeDefined()
  expect(err).toStrictEqual(error)
  expect(task?.result?.error).toStrictEqual(error)
})

test.each(['warmup', 'run'])('%s throws (async)', async mode => {
  const iterations = 1
  const bench = new Bench({
    iterations,
    throws: true,
    warmup: mode === 'warmup',
    warmupIterations: iterations,
  })
  const error = new Error()

  bench.add('error', () => {
    throw error
  })

  let err: Error | undefined
  let task: Task | undefined
  bench.addEventListener('error', evt => {
    const { error: e, task: t } = evt
    err = e
    task = t
  })

  await expect(bench.run()).rejects.toThrowError(error)
  expect(err).toStrictEqual(error)
  expect(task?.result?.error).toStrictEqual(error)
})

test.each(['warmup', 'run'])('%s throws (sync)', mode => {
  const iterations = 1
  const bench = new Bench({
    iterations,
    throws: true,
    warmup: mode === 'warmup',
    warmupIterations: iterations,
  })
  const error = new Error()

  bench.add('error', () => {
    throw error
  })

  let err: Error | undefined
  let task: Task | undefined
  bench.addEventListener('error', evt => {
    const { error: e, task: t } = evt
    err = e
    task = t
  })

  expect(() => {
    bench.runSync()
  }).toThrowError(error)
  expect(err).toStrictEqual(error)
  expect(task?.result?.error).toStrictEqual(error)
})
