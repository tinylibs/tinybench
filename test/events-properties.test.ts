import { expectTypeOf, test } from 'vitest'

import {
  Bench,
  type BenchEvent,
  type BenchLike,
  type Task,
} from '../src'

type NativeAddEventListenerParameters = Parameters<
  EventTarget['addEventListener']
>
type NativeRemoveEventListenerParameters = Parameters<
  EventTarget['removeEventListener']
>

test('events properties', () => {
  const bench = new Bench().add('foo', () => undefined)
  const benchLike: BenchLike = bench

  // The native fallback must remain the final overload on every public surface.
  expectTypeOf<Parameters<Bench['addEventListener']>>()
    .toEqualTypeOf<NativeAddEventListenerParameters>()
  expectTypeOf<Parameters<Bench['removeEventListener']>>()
    .toEqualTypeOf<NativeRemoveEventListenerParameters>()
  expectTypeOf<Parameters<Task['addEventListener']>>()
    .toEqualTypeOf<NativeAddEventListenerParameters>()
  expectTypeOf<Parameters<Task['removeEventListener']>>()
    .toEqualTypeOf<NativeRemoveEventListenerParameters>()
  expectTypeOf<Parameters<BenchLike['addEventListener']>>()
    .toEqualTypeOf<NativeAddEventListenerParameters>()
  expectTypeOf<Parameters<BenchLike['removeEventListener']>>()
    .toEqualTypeOf<NativeRemoveEventListenerParameters>()

  const fooTask = bench.getTask('foo')

  if (!fooTask) return

  // Task events

  fooTask.addEventListener('abort', evt => {
    expectTypeOf(evt).toEqualTypeOf<BenchEvent<'abort', 'task'>>()
  })

  fooTask.addEventListener('complete', evt => {
    expectTypeOf(evt).toEqualTypeOf<BenchEvent<'complete', 'task'>>()
  })

  fooTask.addEventListener('cycle', evt => {
    expectTypeOf(evt).toEqualTypeOf<BenchEvent<'cycle', 'task'>>()
  })

  fooTask.addEventListener('error', evt => {
    expectTypeOf(evt).toEqualTypeOf<BenchEvent<'error', 'task'>>()
  })

  fooTask.addEventListener('reset', evt => {
    expectTypeOf(evt).toEqualTypeOf<BenchEvent<'reset', 'task'>>()
  })

  fooTask.addEventListener('start', evt => {
    expectTypeOf(evt).toEqualTypeOf<BenchEvent<'start', 'task'>>()
  })

  fooTask.addEventListener('warmup', evt => {
    expectTypeOf(evt).toEqualTypeOf<BenchEvent<'warmup', 'task'>>()
  })

  fooTask.addEventListener('custom', evt => {
    expectTypeOf(evt).not.toBeAny()
    expectTypeOf(evt).toEqualTypeOf<Event>()
  })

  fooTask.removeEventListener('custom', evt => {
    expectTypeOf(evt).not.toBeAny()
    expectTypeOf(evt).toEqualTypeOf<Event>()
  })

  fooTask.removeEventListener('abort', evt => {
    expectTypeOf(evt).toEqualTypeOf<BenchEvent<'abort', 'task'>>()
  })

  // Bench events

  bench.addEventListener('abort', evt => {
    expectTypeOf(evt).toEqualTypeOf<BenchEvent<'abort'>>()
  })

  bench.addEventListener('add', evt => {
    expectTypeOf(evt).toEqualTypeOf<BenchEvent<'add'>>()
  })

  bench.addEventListener('complete', evt => {
    expectTypeOf(evt).toEqualTypeOf<BenchEvent<'complete'>>()
  })

  bench.addEventListener('cycle', evt => {
    expectTypeOf(evt).toEqualTypeOf<BenchEvent<'cycle'>>()
  })

  bench.addEventListener('error', evt => {
    expectTypeOf(evt).toEqualTypeOf<BenchEvent<'error'>>()
  })

  bench.addEventListener('remove', evt => {
    expectTypeOf(evt).toEqualTypeOf<BenchEvent<'remove'>>()
  })

  bench.addEventListener('reset', evt => {
    expectTypeOf(evt).toEqualTypeOf<BenchEvent<'reset'>>()
  })

  bench.addEventListener('start', evt => {
    expectTypeOf(evt).toEqualTypeOf<BenchEvent<'start'>>()
  })

  bench.addEventListener('warning', evt => {
    expectTypeOf(evt).toEqualTypeOf<BenchEvent<'warning'>>()
  })

  bench.addEventListener('warmup', evt => {
    expectTypeOf(evt).toEqualTypeOf<BenchEvent<'warmup'>>()
  })

  bench.addEventListener('custom', evt => {
    expectTypeOf(evt).not.toBeAny()
    expectTypeOf(evt).toEqualTypeOf<Event>()
  })

  bench.removeEventListener('custom', evt => {
    expectTypeOf(evt).not.toBeAny()
    expectTypeOf(evt).toEqualTypeOf<Event>()
  })

  bench.removeEventListener('abort', evt => {
    expectTypeOf(evt).toEqualTypeOf<BenchEvent<'abort'>>()
  })

  // BenchLike events

  benchLike.addEventListener('abort', evt => {
    expectTypeOf(evt).toEqualTypeOf<BenchEvent<'abort'>>()
  })

  benchLike.removeEventListener('abort', evt => {
    expectTypeOf(evt).toEqualTypeOf<BenchEvent<'abort'>>()
  })

  benchLike.addEventListener('custom', evt => {
    expectTypeOf(evt).not.toBeAny()
    expectTypeOf(evt).toEqualTypeOf<Event>()
  })

  benchLike.removeEventListener('custom', evt => {
    expectTypeOf(evt).not.toBeAny()
    expectTypeOf(evt).toEqualTypeOf<Event>()
  })
})
