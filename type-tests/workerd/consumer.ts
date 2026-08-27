import {
  Bench,
  type BenchEvent,
  type BenchLike,
  type Task,
} from '../../dist/index.js'

type IsAny<T> = 0 extends 1 & T ? true : false

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
  expectType<IsAny<typeof event>>(false)
  expectType<Event>(event)
})
bench.removeEventListener('custom', event => {
  expectType<IsAny<typeof event>>(false)
  expectType<Event>(event)
})
task.addEventListener('custom', event => {
  expectType<IsAny<typeof event>>(false)
  expectType<Event>(event)
})
task.removeEventListener('custom', event => {
  expectType<IsAny<typeof event>>(false)
  expectType<Event>(event)
})
benchLike.addEventListener('custom', event => {
  expectType<IsAny<typeof event>>(false)
  expectType<Event>(event)
})
benchLike.removeEventListener('custom', event => {
  expectType<IsAny<typeof event>>(false)
  expectType<Event>(event)
})

bench.removeEventListener('abort', event => {
  expectType<BenchEvent<'abort'>>(event)
})
task.removeEventListener('abort', event => {
  expectType<BenchEvent<'abort', 'task'>>(event)
})
benchLike.removeEventListener('abort', event => {
  expectType<BenchEvent<'abort'>>(event)
})

task.addEventListener(
  'abort',
  event => {
    expectType<BenchEvent<'abort', 'task'>>(event)
  },
  { once: true }
)
task.removeEventListener(
  'abort',
  {
    handleEvent (event) {
      expectType<BenchEvent<'abort', 'task'>>(event)
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
