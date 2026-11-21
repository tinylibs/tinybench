import { describe, expect, test } from 'vitest'

import { Bench, type Task } from '../src'
import { each } from '../src/each'

const taskNames = (bench: Bench): string[] => bench.tasks.map((task) => task.name)

const tiny = (): Bench =>
  new Bench({ iterations: 1, time: 1, warmup: false })

describe('name rendering', () => {
  const rendered = (template: string, row: unknown): string => {
    const bench = new Bench()
    each(bench, [row])(template, () => { /* noop */ })
    return taskNames(bench)[0] ?? ''
  }

  test('primitive, tuple and object tables', () => {
    const bench = new Bench()
    each(bench, ['foo', 'bar'])('%s task', () => { /* noop */ })
    expect(taskNames(bench)).toEqual(['foo task', 'bar task'])

    const tuple = new Bench()
    each(tuple, [[1, 1, 2], [1, 2, 3]] as const)('add($0, $1) -> $2', () => { /* noop */ })
    expect(taskNames(tuple)).toEqual(['add(1, 1) -> 2', 'add(1, 2) -> 3'])

    const objects = new Bench()
    each(objects, [{ a: 1, b: 1 }, { a: 2, b: 1 }])('add($a, $b)', () => { /* noop */ })
    expect(taskNames(objects)).toEqual(['add(1, 1)', 'add(2, 1)'])
  })

  test('index tokens', () => {
    const bench = new Bench()
    each(bench, ['a', 'b'])('%#/%$', () => { /* noop */ })
    expect(taskNames(bench)).toEqual(['0/1', '1/2'])
  })

  test('scanner pins', () => {
    const row: Record<string, unknown> = { '01': 7, a: 1, HOME: 'X', id: 'X' }
    expect(rendered('%%#', row)).toBe('%#')
    expect(rendered('%%%#', row)).toBe('%0')
    expect(rendered('%%$id', row)).toBe('%X')
    expect(rendered('%$$id', row)).toBe('1X')
    expect(rendered('%x', row)).toBe('%x')
    expect(rendered('trail%', row)).toBe('trail%')
    expect(rendered('$', row)).toBe('$')
    expect(rendered('$-', row)).toBe('$-')
    expect(rendered('$$HOME', row)).toBe('$HOME')
    expect(rendered('$HOME', row)).toBe('X')
    expect(rendered('$MISSING', row)).toBe('$MISSING')
    expect(rendered('$idSuffix', { idSuffix: 'S' })).toBe('S')
    expect(rendered('$a.', row)).toBe('1.')
    expect(rendered('$a..b', row)).toBe('1..b')
    expect(rendered('$01', row)).toBe('7')
    expect(rendered('$a.length', { a: [7] })).toBe('1')
    expect(rendered('$a.length', { a: 'abc' })).toBe('$a.length')
  })

  test('substituted text is never re-scanned', () => {
    expect(rendered('x%sy', '$HOME')).toBe('x$HOMEy')
    expect(rendered('%s', '%#')).toBe('%#')
  })

  test('value rendering', () => {
    expect(rendered('%s', undefined)).toBe('undefined')
    expect(rendered('%j', undefined)).toBe('[object Undefined]')
    expect(rendered('%s', null)).toBe('null')
    expect(rendered('%s', -0)).toBe('0')
    expect(rendered('%s', 1.5)).toBe('1.5')
    expect(rendered('%s', 1n)).toBe('1n')
    expect(rendered('%j', 1n)).toBe('[object BigInt]')
    expect(rendered('%s', Symbol('s'))).toBe('Symbol(s)')
    expect(rendered('%s', true)).toBe('true')
    expect(rendered('%s', () => { /* noop */ })).toBe('[Function]')
    expect(rendered('%s', { a: 1 })).toBe('{"a":1}')
    expect(rendered('%j', { a: 1 })).toBe('{"a":1}')
    expect(rendered('%s', [1, 2])).toBe('[1,2]')

    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(rendered('%s', circular)).toBe('[object Object]')
    expect(rendered('%s', { toJSON () { throw new Error('boom') } })).toBe('[object Object]')
    // toJSON returning undefined makes JSON.stringify return undefined -> tag fallback
    expect(rendered('%s', { toJSON: () => undefined })).toBe('[object Object]')
  })

  test('name callbacks', () => {
    const bench = new Bench()
    each(bench, ['a', 'b'])((row, index) => `${row}-${String(index)}`, () => { /* noop */ })
    expect(taskNames(bench)).toEqual(['a-0', 'b-1'])

    // callback results are verbatim, no token processing
    expect(rendered('unused', 'x') !== '%#/$x').toBe(true)
    const verbatim = new Bench()
    each(verbatim, ['x'])(() => '%#/$x', () => { /* noop */ })
    expect(taskNames(verbatim)).toEqual(['%#/$x'])
  })
})

describe('registration', () => {
  test('returns the same bench, empty table is a no-op', () => {
    const bench = new Bench()
    expect(each(bench, ['a'])('%s', () => { /* noop */ })).toBe(bench)
    expect(each(bench, [])('%s', () => { /* noop */ })).toBe(bench)
    expect(bench.tasks).toHaveLength(1)
  })

  test('single length read', () => {
    let lengthReads = 0
    const cases = new Proxy(['a'], {
      get (target, property, receiver) {
        if (property === 'length') {
          lengthReads += 1
        }
        return Reflect.get(target, property, receiver) as unknown
      },
    })
    const bench = new Bench()
    each(bench, cases)('%s', () => { /* noop */ })
    expect(lengthReads).toBe(1)
  })

  test('snapshot isolation', () => {
    const rows = ['x']
    const bench = tiny()
    const received = new Set<unknown>()
    each(bench, rows)('%s', (row) => {
      received.add(row)
    })
    rows.push('y')
    rows[0] = 'z'
    expect(taskNames(bench)).toEqual(['x'])
    bench.runSync()
    expect([...received]).toEqual(['x'])
  })

  test('duplicate names register nothing', () => {
    const bench = new Bench()
    const events: string[] = []
    bench.addEventListener('add', (event) => {
      events.push(event.task.name)
    })
    expect(() => each(bench, ['A', 'B', 'A'])('%s', () => { /* noop */ })).toThrow(
      'each: task name "A" collides with case 0'
    )
    expect(bench.tasks).toHaveLength(0)
    expect(events).toEqual([])
  })

  test('existing names register nothing and keep identities', () => {
    const bench = new Bench()
    bench.add('B', () => { /* noop */ })
    const original = bench.getTask('B')
    expect(() => each(bench, ['A', 'B'])('%s', () => { /* noop */ })).toThrow(
      'each: task name "B" already registered'
    )
    expect(bench.tasks).toHaveLength(1)
    expect(bench.getTask('B')).toBe(original)
  })

  test('holes are rejected, explicit undefined rows are valid', () => {
    const bench = new Bench()
    const holes: string[] = ['a']
    holes[2] = 'c'
    expect(() => each(bench, holes)('%s', () => { /* noop */ })).toThrow(
      'each: case 1 is a hole'
    )
    expect(bench.tasks).toHaveLength(0)

    each(bench, [undefined, 'b'] as (string | undefined)[])('%s', () => { /* noop */ })
    expect(taskNames(bench)).toEqual(['undefined', 'b'])
  })

  test('non-string name callback results are rejected before any add', () => {
    const bench = new Bench()
    expect(() =>
      each(bench, [1, 2])(() => 42 as unknown as string, () => { /* noop */ })
    ).toThrow(TypeError)
    expect(bench.tasks).toHaveLength(0)
  })

  test('commit stops at the first throwing add', () => {
    const bench = new Bench()
    bench.addEventListener('add', (event) => {
      if (event.task.name === 'A') {
        bench.add('B', () => { /* noop */ })
      }
    })
    expect(() => each(bench, ['A', 'B', 'C'])('%s', () => { /* noop */ })).toThrow(
      'already exists'
    )
    expect(taskNames(bench)).toEqual(['A', 'B'])
    expect(bench.getTask('C')).toBeUndefined()
  })
})

describe('adapter contract', () => {
  test('the row arrives as exactly one argument', () => {
    const received = new Set<unknown>()
    const bench = tiny()
    each(bench, ['str', [1, 2], { a: 1 }, null, undefined] as unknown[])(
      (_row, index) => `t${String(index)}`,
      (row) => {
        received.add(row)
      }
    )
    bench.runSync()
    expect([...received]).toEqual(['str', [1, 2], { a: 1 }, null, undefined])
  })

  test('receiver: undefined at probe time, Task at measurement', () => {
    const seen: string[] = []
    const bench = new Bench()
    each(bench, [1])('%s', function (this: Task | undefined) {
      seen.push(this === undefined ? 'probe' : this.constructor.name)
    })
    expect(seen).toEqual(['probe']) // unpinned plain handler: one probe
    bench.runSync()
    expect(seen[1]).toBe('Task')
  })

  test('return-value overrides flow through', () => {
    const bench = tiny()
    each(bench, [1])(
      (row) => `t${String(row)}`,
      () => ({ overriddenDuration: 150 })
    )
    bench.runSync()
    const result = bench.tasks[0]?.result
    expect(result?.state).toBe('completed')
    if (result?.state !== 'completed') return
    expect(result.latency.mean).toBeGreaterThanOrEqual(149)
  })
})

describe('execution parity with core', () => {
  const handlers = {
    async: (): (() => unknown) =>
      async function () { /* noop */ },
    promise: (): (() => unknown) =>
      function () {
        return Promise.resolve()
      },
    value: (): (() => unknown) =>
      function () {
        return 1
      },
  }

  const runCell = async (
    kind: keyof typeof handlers,
    pin: boolean | undefined
  ): Promise<{ regCalls: number; runState: string; syncState: string }> => {
    let calls = 0
    const make = () => {
      const inner = handlers[kind]()
      return kind === 'async'
        ? async function (this: unknown) {
          calls += 1
          await inner()
        }
        : function (this: unknown) {
          calls += 1
          return inner()
        }
    }
    const fnOptions = pin === undefined ? undefined : { async: pin }

    const benchRun = tiny()
    const before = calls
    each(benchRun, [1])('t', make(), fnOptions)
    const regCalls = calls - before
    await benchRun.run()

    const benchSync = tiny()
    try {
      each(benchSync, [1])('t', make(), fnOptions).runSync()
    } catch {
      // runSync may throw synchronously; the task state carries the result
    }

    return {
      regCalls,
      runState: benchRun.tasks[0]?.result.state as string,
      syncState: benchSync.tasks[0]?.result.state as string,
    }
  }

  test('native async: no probe, run completed, runSync errored', async () => {
    for (const pin of [undefined, true, false] as const) {
      const cell = await runCell('async', pin)
      expect(cell.regCalls, `pin ${String(pin)}`).toBe(0)
      expect(cell.runState, `pin ${String(pin)}`).toBe(
        pin === false ? 'errored' : 'completed'
      )
      expect(cell.syncState, `pin ${String(pin)}`).toBe('errored')
    }
  })

  test('plain promise-returning: probed per row unpinned', async () => {
    for (const [pin, calls] of [
      [undefined, 1],
      [true, 0],
      [false, 0],
    ] as const) {
      const cell = await runCell('promise', pin)
      expect(cell.regCalls, `pin ${String(pin)}`).toBe(calls)
      expect(cell.runState, `pin ${String(pin)}`).toBe(
        pin === false ? 'errored' : 'completed'
      )
      expect(cell.syncState, `pin ${String(pin)}`).toBe('errored')
    }
  })

  test('plain value-returning: always completes', async () => {
    for (const [pin, calls] of [
      [undefined, 1],
      [true, 0],
      [false, 0],
    ] as const) {
      const cell = await runCell('value', pin)
      expect(cell.regCalls, `pin ${String(pin)}`).toBe(calls)
      expect(cell.runState, `pin ${String(pin)}`).toBe('completed')
      expect(cell.syncState, `pin ${String(pin)}`).toBe('completed')
    }
  })

  test('shared signal reaches every task', async () => {
    const controller = new AbortController()
    controller.abort()
    const bench = new Bench()
    each(bench, ['a', 'b'])('%s', () => { /* noop */ }, { signal: controller.signal })
    await bench.run()
    expect(bench.tasks.map((task) => task.result.state)).toEqual([
      'aborted',
      'aborted',
    ])
  })
})

describe('typing fixtures (compile-time, checked by typecheck)', () => {
  test('inference', () => {
    const bench = new Bench()
    class MyBench extends Bench {
      extra (): number {
        return 1
      }
    }

    each(bench, [[1, 2], [3, 4]])('t1-%#', (row) => {
      const rows: number[] = row
      return rows.length
    })
    each(bench, [[1, 2]] as const)('t2', ([a, b]) => a + b)
    each(bench, [{ a: 1 }])('t3', ({ a }) => a)
    each(bench, ['a'])('%s', (p) => p.toUpperCase())
    each(bench, [])('t4', (row) => row satisfies never)
    each(bench, ['a', [1, 2]] as const)('t5-%#', (row) => {
      const union: 'a' | readonly [1, 2] = row
      return union
    })
    each(bench, [1])((row, index) => `${String(row)}-${String(index)}`, (row) => row)
    each(bench, [1])('t6', function (this: Task | undefined) {
      return this?.name
    })
    const chained = new MyBench()
    expect(each(chained, [1])('t', () => { /* noop */ }).extra()).toBe(1)

    // @ts-expect-error the row is number[], not string
    each(bench, [[1, 2]])('t7', (row: string) => row)
  })
})
