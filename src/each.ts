import type { Bench } from './bench'
import type { Task } from './task'
import type { Fn, FnOptions } from './types'

/**
 * The function returned by {@link each}: registers one task per case.
 * @param name - Name template (see {@link each} for the tokens) or callback.
 * @param fn - Task function, called with exactly one argument: the whole
 * case row, destructure it for tuple rows. `this` is the {@link Task} at
 * measurement time, `undefined` during the async probe of unpinned plain
 * functions.
 * @param fnOptions - Options shared by every generated task; the object is
 * passed to `Bench.add` untouched.
 * @returns The bench, for chaining.
 * @throws {Error} When a case is a hole, a name callback does not return a
 * string, or two rendered names collide (intra-table or already registered) -
 * in which case no task is registered.
 */
export type EachRegistrar<T, B extends Bench> = (
  name: NameCallback<T> | string,
  fn: (this: Task | undefined, row: T) => unknown,
  fnOptions?: FnOptions
) => B

/**
 * Callback producing the task name for one case. The result is used verbatim
 * (no token processing) and must be a string.
 * @param row - The case.
 * @param index - The 0-based case index.
 * @returns The task name.
 */
export type NameCallback<T> = (row: T, index: number) => string

const isSegmentChar = (char: string): boolean =>
  (char >= 'a' && char <= 'z') ||
  (char >= 'A' && char <= 'Z') ||
  (char >= '0' && char <= '9') ||
  char === '_'

const isContainer = (value: unknown): boolean =>
  typeof value === 'object' && value !== null

const renderJson = (value: unknown): string => {
  try {
    const json = JSON.stringify(value)
    if (typeof json === 'string') {
      return json
    }
  } catch {
    // user `toJSON`/getters may throw: fall back to the tag
  }
  return Object.prototype.toString.call(value)
}

const render = (value: unknown): string => {
  switch (typeof value) {
    case 'bigint':
      return `${String(value)}n`
    case 'function':
      return '[Function]'
    case 'number':
      return Object.is(value, -0) ? '0' : String(value)
    case 'object':
      return value === null ? 'null' : renderJson(value)
    case 'string':
      return value
    case 'undefined':
      return 'undefined'
    default:
      return String(value)
  }
}

interface PathMatch {
  end: number
  segments: string[]
}

const matchPath = (template: string, start: number): PathMatch | undefined => {
  let i = start + 1
  const segments: string[] = []
  for (;;) {
    const segmentStart = i
    while (i < template.length && isSegmentChar(template.charAt(i))) {
      i += 1
    }
    if (i === segmentStart) {
      break
    }
    segments.push(template.slice(segmentStart, i))
    if (
      template.charAt(i) === '.' &&
      i + 1 < template.length &&
      isSegmentChar(template.charAt(i + 1))
    ) {
      i += 1
      continue
    }
    break
  }
  return segments.length === 0 ? undefined : { end: i, segments }
}

const resolvePath = (segments: string[], row: unknown): unknown => {
  let current: unknown = row
  for (const segment of segments) {
    if (!isContainer(current)) {
      return undefined
    }
    const value = (current as Record<string, unknown>)[segment]
    if (value === undefined) {
      return undefined
    }
    current = value
  }
  return current
}

const formatName = (template: string, row: unknown, index: number): string => {
  let output = ''
  let i = 0
  while (i < template.length) {
    const char = template.charAt(i)
    if (char === '%') {
      const next = template.charAt(i + 1)
      if (next === '%') {
        output += '%'
        i += 2
      } else if (next === '#') {
        output += String(index)
        i += 2
      } else if (next === '$') {
        output += String(index + 1)
        i += 2
      } else if (next === 's') {
        output += render(row)
        i += 2
      } else if (next === 'j') {
        output += renderJson(row)
        i += 2
      } else {
        output += '%'
        i += 1
      }
      continue
    }
    if (char === '$') {
      if (template.charAt(i + 1) === '$') {
        output += '$'
        i += 2
        continue
      }
      const match = matchPath(template, i)
      if (match === undefined) {
        output += '$'
        i += 1
        continue
      }
      const resolved = resolvePath(match.segments, row)
      output +=
        resolved === undefined ? template.slice(i, match.end) : render(resolved)
      i = match.end
      continue
    }
    output += char
    i += 1
  }
  return output
}

const makeAdapter = (
  fn: (this: Task | undefined, row: never) => unknown,
  row: unknown
): Fn => {
  const args: unknown[] = [row]
  const adapter = function (this: unknown): unknown {
    return Reflect.apply(fn as (this: unknown) => unknown, this, args)
  }
  // Keep core's async classification transparent: reading `constructor` on
  // the adapter must see the handler constructor (async syntax detection
  // without calling the task function).
  Object.defineProperty(adapter, 'constructor', {
    get: () => fn.constructor,
  })
  return adapter
}

/**
 * Registers one task per case of a table - parameterized benchmarks.
 *
 * Names are rendered, validated and checked for duplicates before the first
 * task is registered; on failure no task is registered. Commit then registers
 * tasks in case order and stops at the first failing registration.
 *
 * ```ts
 * import { Bench } from 'tinybench'
 * import { each } from 'tinybench/each'
 *
 * const bench = new Bench()
 * each(bench, ['foo', 'bar'])('%s task', (param) => doWork(param))
 * each(bench, [[1, 2], [3, 4]] as const)('add($0, $1)', ([a, b]) => a + b)
 * each(bench, cases)((c) => `parse ${c.id}`, (c) => parse(c.input))
 * ```
 *
 * Name tokens: `%%` and `$$` literal `%`/`$`; `%#`/`%$` 0-based/1-based case
 * index; `%s`/`%j` the row (`%j` as JSON, both with a tag fallback for
 * unserializable values); `$path` a dotted property path resolved against the
 * row (objects and arrays only, the whole token stays literal when
 * unresolvable). Substituted text is never re-scanned.
 *
 * Every case is a full benchmark task: cost, hooks and abort behave per task
 * as with `Bench.add` (`beforeAll` runs per task and phase, bench-level hooks
 * cannot see the case, a shared `fnOptions.signal` reaches every task). Rows
 * are held by reference: mutating an input after registration changes the
 * work measured under the rendered name. `%#` is a display label - for stable
 * cross-run names use a name callback or stable row fields.
 * @param bench - Bench to register the tasks on.
 * @param cases - Case table; each case is passed whole to the task function.
 * @returns The registrar function registering one task per case.
 * @throws {Error} When the table contains a hole (use explicit `undefined`
 * rows instead).
 */
export function each<T, B extends Bench> (
  bench: B,
  cases: readonly T[]
): EachRegistrar<T, B> {
  return (name, fn, fnOptions) => {
    const length = cases.length
    if (length === 0) {
      return bench
    }

    const rows: T[] = []
    for (let i = 0; i < length; i++) {
      if (!Object.hasOwn(cases, i)) {
        throw new Error(
          `each: case ${String(i)} is a hole; use explicit undefined rows instead`
        )
      }
      rows.push(cases[i] as T)
    }

    const entries: { name: string, row: T }[] = []
    for (const [i, row] of rows.entries()) {
      const rendered =
        typeof name === 'function' ? name(row, i) : formatName(name, row, i)
      if (typeof rendered !== 'string') {
        throw new TypeError(
          `each: name callback must return a string, got ${typeof rendered}`
        )
      }
      entries.push({ name: rendered, row })
    }

    const seen = new Map<string, number>()
    for (const [i, { name: rendered }] of entries.entries()) {
      const first = seen.get(rendered)
      if (first !== undefined) {
        throw new Error(
          `each: task name "${rendered}" collides with case ${String(first)}`
        )
      }
      seen.set(rendered, i)
      if (bench.getTask(rendered) !== undefined) {
        throw new Error(`each: task name "${rendered}" already registered`)
      }
    }

    for (const { name: rendered, row } of entries) {
      bench.add(rendered, makeAdapter(fn, row), fnOptions)
    }

    return bench
  }
}
