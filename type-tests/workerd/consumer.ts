import {
  Bench,
  type BenchEvent,
  type BenchLike,
  type Fn,
  type FnReturnedObject,
  Task,
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

// Explicit measurement contracts are checked without restricting task results.
bench.add('typed-sync', (): FnReturnedObject => ({ overriddenDuration: 2 }))
bench.add('typed-async', async (): Promise<FnReturnedObject> => ({
  overriddenIterationCost: 5,
}))
bench.add('typed-batch', () => ({
  overriddenDuration: 0.5,
  overriddenIterationCost: 25,
} satisfies FnReturnedObject))
expectType<FnReturnedObject>({})

// Each field is checked separately so weakening one cannot hide behind the other.
// @ts-expect-error a duration measurement must be numeric
bench.add('bad-duration', (): FnReturnedObject => ({ overriddenDuration: '2' }))
// @ts-expect-error an iteration cost must be numeric
bench.add('bad-cost', (): FnReturnedObject => ({ overriddenIterationCost: '5' }))
// @ts-expect-error the async measurement contract also rejects string durations
bench.add('bad-async-duration', async (): Promise<FnReturnedObject> => ({ overriddenDuration: '2' }))
// @ts-expect-error the async measurement contract also rejects string costs
bench.add('bad-async-cost', async (): Promise<FnReturnedObject> => ({ overriddenIterationCost: '5' }))
// @ts-expect-error satisfies checks the duration without changing callback typing
bench.add('bad-satisfies-duration', () => ({ overriddenDuration: '2' } satisfies FnReturnedObject))
// @ts-expect-error satisfies also checks iteration costs independently
bench.add('bad-satisfies-cost', () => ({ overriddenIterationCost: '5' } satisfies FnReturnedObject))
// @ts-expect-error exactOptionalPropertyTypes permits omission, not explicit undefined
expectType<FnReturnedObject>({ overriddenDuration: undefined })
// @ts-expect-error the iteration cost has the same exact optional contract
expectType<FnReturnedObject>({ overriddenIterationCost: undefined })

// Ordinary results and already-erased callback types remain supported.
bench.add('ordinary-number', () => 42)
bench.add('ordinary-object', () => ({ payload: 'value' }))
bench.add('ordinary-async', async () => 'value')
const unannotated: Fn = () => ({ overriddenDuration: 'runtime-validated' })
bench.add('unannotated', unannotated)
new Task(bench, 'direct-ordinary', () => ({ payload: true }))
new Task(bench, 'direct-measurement', (): FnReturnedObject => ({ overriddenIterationCost: 5 }))

declare const overloaded: {
  (): number
  (mode: string): { overriddenDuration: string }
}
bench.add('overloaded', overloaded)
new Task(bench, 'direct-overloaded', overloaded)

// The named public type can itself be re-exported by consumers.
export type { FnReturnedObject } from '../../dist/index.js'

