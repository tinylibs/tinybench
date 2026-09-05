import {
  Bench,
  type BenchEvent,
  type BenchLike,
  type Task,
} from '../../dist/index.js'

type IsAny<T> = 0 extends 1 & T ? true : false

type IsExact<Actual, Expected> = IsAny<Actual> extends true
  ? false
  : [Actual, Expected] extends [Expected, Actual]
      ? true
      : false

export declare class BenchCompatibility extends EventTarget {
  addEventListener: Bench['addEventListener']
  removeEventListener: Bench['removeEventListener']
}

export declare class BenchLikeCompatibility extends EventTarget {
  addEventListener: BenchLike['addEventListener']
  removeEventListener: BenchLike['removeEventListener']
}

export declare class TaskCompatibility extends EventTarget {
  addEventListener: Task['addEventListener']
  removeEventListener: Task['removeEventListener']
}

declare function expectType<T> (value: T, expected?: T): void

const bench = new Bench().add('task', () => undefined)
const task = bench.getTask('task')
const benchLike: BenchLike = bench

if (task == null) {
  throw new Error('Expected the benchmark task to exist')
}

bench.addEventListener('custom', event => {
  expectType<IsExact<typeof event, Event>>(true)
})
bench.removeEventListener('custom', event => {
  expectType<IsExact<typeof event, Event>>(true)
})
task.addEventListener('custom', event => {
  expectType<IsExact<typeof event, Event>>(true)
})
task.removeEventListener('custom', event => {
  expectType<IsExact<typeof event, Event>>(true)
})
benchLike.addEventListener('custom', event => {
  expectType<IsExact<typeof event, Event>>(true)
})
benchLike.removeEventListener('custom', event => {
  expectType<IsExact<typeof event, Event>>(true)
})

bench.addEventListener(
  'custom',
  {
    handleEvent (event) {
      expectType<IsExact<typeof event, Event>>(true)
    },
  },
  { once: true }
)
benchLike.removeEventListener(
  'custom',
  {
    handleEvent (event) {
      expectType<IsExact<typeof event, Event>>(true)
    },
  },
  { capture: true }
)

bench.removeEventListener('abort', event => {
  expectType<IsExact<typeof event, BenchEvent<'abort'>>>(true)
  expectType<IsExact<typeof event.type, 'abort'>>(true)
})
task.removeEventListener('abort', event => {
  expectType<IsExact<typeof event, BenchEvent<'abort', 'task'>>>(true)
})
benchLike.removeEventListener('abort', event => {
  expectType<IsExact<typeof event, BenchEvent<'abort'>>>(true)
})

task.addEventListener(
  'abort',
  event => {
    expectType<IsExact<typeof event, BenchEvent<'abort', 'task'>>>(true)
  },
  { once: true }
)
task.removeEventListener(
  'abort',
  {
    handleEvent (event) {
      expectType<IsExact<typeof event, BenchEvent<'abort', 'task'>>>(true)
    },
  },
  { capture: true }
)
task.addEventListener('abort', null, true)
task.removeEventListener('abort', null, true)

// @ts-expect-error EventTarget event names are strings
bench.addEventListener(1, () => undefined)
// @ts-expect-error EventTarget event names are strings
bench.removeEventListener(1, () => undefined)
