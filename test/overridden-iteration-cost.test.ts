import { expect, test } from 'vitest'

import { Bench } from '../src'

/**
 * Constant clocks keep measured samples at zero. Callback bounds make budget
 * regressions fail synchronously instead of starving the test timeout timer.
 * Step and cycling clocks exercise timer correction and diagnostics.
 */

test('overriddenDuration alone drives the time budget (async)', async () => {
  const bench = new Bench({
    iterations: 1,
    now: () => 100,
    throws: true,
    time: 100,
    warmup: false,
  })

  let calls = 0
  bench.add('foo', async () => {
    if (++calls > 100) throw new Error('iteration bound exceeded')
    await Promise.resolve()
    return { overriddenDuration: 50 }
  })

  await bench.run()

  const fooTask = bench.getTask('foo')
  if (!fooTask) return expect.unreachable()
  expect(fooTask.result.state).toBe('completed')
  if (fooTask.result.state !== 'completed') return
  expect(fooTask.runs).toBe(2)
})

test('overriddenDuration alone drives the time budget (sync)', () => {
  const bench = new Bench({
    iterations: 1,
    now: () => 100,
    throws: true,
    time: 100,
    warmup: false,
  })

  let calls = 0
  bench.add('foo', () => {
    if (++calls > 100) throw new Error('iteration bound exceeded')
    return { overriddenDuration: 50 }
  })

  bench.runSync()

  const fooTask = bench.getTask('foo')
  if (!fooTask) return expect.unreachable()
  expect(fooTask.result.state).toBe('completed')
  if (fooTask.result.state !== 'completed') return
  expect(fooTask.runs).toBe(2)
})

test('overriddenIterationCost decouples budget from sample (async)', async () => {
  const bench = new Bench({
    iterations: 2,
    now: () => 100,
    throws: true,
    time: 150,
    warmup: false,
  })

  let calls = 0
  bench.add('batch', async () => {
    if (++calls > 100) throw new Error('iteration bound exceeded')
    await Promise.resolve()
    return { overriddenDuration: 0.5, overriddenIterationCost: 25 }
  })

  await bench.run()

  const batchTask = bench.getTask('batch')
  if (!batchTask) return expect.unreachable()
  expect(batchTask.result.state).toBe('completed')
  if (batchTask.result.state !== 'completed') return
  expect(batchTask.runs).toBe(6)
  expect(batchTask.result.latency.mean).toBe(0.5)
  expect(batchTask.result.latency.min).toBe(0.5)
  expect(batchTask.result.latency.max).toBe(0.5)
})

test('overriddenIterationCost decouples budget from sample (sync)', () => {
  const bench = new Bench({
    iterations: 2,
    now: () => 100,
    throws: true,
    time: 150,
    warmup: false,
  })

  let calls = 0
  bench.add('batch', () => {
    if (++calls > 100) throw new Error('iteration bound exceeded')
    return { overriddenDuration: 0.5, overriddenIterationCost: 25 }
  })

  bench.runSync()

  const batchTask = bench.getTask('batch')
  if (!batchTask) return expect.unreachable()
  expect(batchTask.result.state).toBe('completed')
  if (batchTask.result.state !== 'completed') return
  expect(batchTask.runs).toBe(6)
  expect(batchTask.result.latency.mean).toBe(0.5)
})

test('overriddenIterationCost alone keeps timer-measured samples', async () => {
  const bench = new Bench({
    iterations: 1,
    now: () => 100,
    throws: true,
    time: 20,
    warmup: false,
  })

  let calls = 0
  bench.add('oic', async () => {
    if (++calls > 100) throw new Error('iteration bound exceeded')
    await Promise.resolve()
    return { overriddenIterationCost: 5 }
  })

  await bench.run()

  const oicTask = bench.getTask('oic')
  if (!oicTask) return expect.unreachable()
  expect(oicTask.result.state).toBe('completed')
  if (oicTask.result.state !== 'completed') return
  expect(oicTask.runs).toBe(4)
  expect(oicTask.result.latency.mean).toBe(0)
})

test('overriddenIterationCost alone keeps timer-measured samples (sync)', () => {
  const bench = new Bench({
    iterations: 1,
    now: () => 100,
    throws: true,
    time: 20,
    warmup: false,
  })

  let calls = 0
  bench.add('oic', () => {
    if (++calls > 100) throw new Error('iteration bound exceeded')
    return { overriddenIterationCost: 5 }
  })

  bench.runSync()

  const oicTask = bench.getTask('oic')
  if (!oicTask) return expect.unreachable()
  expect(oicTask.result.state).toBe('completed')
  if (oicTask.result.state !== 'completed') return
  expect(oicTask.runs).toBe(4)
  expect(oicTask.result.latency.mean).toBe(0)
})

test('invalid overriddenIterationCost is treated as absent (async)', async () => {
  const invalidCosts: unknown[] = [Number.NaN, Number.POSITIVE_INFINITY, -1, '25']
  for (const cost of invalidCosts) {
    const bench = new Bench({
      iterations: 1,
      now: () => 100,
      throws: true,
      time: 6,
      warmup: false,
    })

    let calls = 0
    bench.add('foo', async () => {
      if (++calls > 100) throw new Error('iteration bound exceeded')
      await Promise.resolve()
      return { overriddenDuration: 2, overriddenIterationCost: cost }
    })

    await bench.run()

    const fooTask = bench.getTask('foo')
    if (!fooTask) return expect.unreachable()
    expect(fooTask.result.state).toBe('completed')
    if (fooTask.result.state !== 'completed') return
    expect(fooTask.runs).toBe(3)
    expect(fooTask.result.latency.mean).toBe(2)
  }
})

test('invalid overriddenIterationCost is treated as absent (sync)', () => {
  const invalidCosts: unknown[] = [Number.NaN, Number.POSITIVE_INFINITY, -1, '25']
  for (const cost of invalidCosts) {
    const bench = new Bench({
      iterations: 1,
      now: () => 100,
      throws: true,
      time: 6,
      warmup: false,
    })

    let calls = 0
    bench.add('foo', () => {
      if (++calls > 100) throw new Error('iteration bound exceeded')
      return { overriddenDuration: 2, overriddenIterationCost: cost }
    })

    bench.runSync()

    const fooTask = bench.getTask('foo')
    if (!fooTask) return expect.unreachable()
    expect(fooTask.result.state).toBe('completed')
    if (fooTask.result.state !== 'completed') return
    expect(fooTask.runs).toBe(3)
    expect(fooTask.result.latency.mean).toBe(2)
  }
})

test('overriddenIterationCost does not control the task concurrency budget', async () => {
  for (const cost of [0, 1000]) {
    let tick = 0
    let calls = 0
    const bench = new Bench({
      concurrency: 'task',
      iterations: 0,
      now: () => ++tick,
      threshold: 1,
      throws: true,
      time: 15,
      warmup: false,
    })

    bench.add('concurrent', async () => {
      if (++calls > 100) throw new Error('iteration bound exceeded')
      await Promise.resolve()
      return { overriddenDuration: 2, overriddenIterationCost: cost }
    }, { async: true })

    await bench.run()

    const concurrentTask = bench.getTask('concurrent')
    if (!concurrentTask) return expect.unreachable()
    expect(concurrentTask.result.state).toBe('completed')
    expect(concurrentTask.runs).toBe(5)
  }
})

test('overriddenIterationCost drives the warmup budget (async)', async () => {
  const bench = new Bench({
    iterations: 1,
    now: () => 100,
    throws: true,
    time: 50,
    warmup: true,
    warmupIterations: 0,
    warmupTime: 50,
  })

  let calls = 0
  bench.add('warm', async () => {
    if (++calls > 100) throw new Error('iteration bound exceeded')
    await Promise.resolve()
    return { overriddenIterationCost: 10 }
  }, { async: true })

  await bench.run()

  expect(calls).toBe(10)
})

test('overriddenIterationCost drives the warmup budget (sync)', () => {
  const bench = new Bench({
    iterations: 1,
    now: () => 100,
    throws: true,
    time: 50,
    warmup: true,
    warmupIterations: 0,
    warmupTime: 50,
  })

  let calls = 0
  bench.add('warm', () => {
    if (++calls > 100) throw new Error('iteration bound exceeded')
    return { overriddenIterationCost: 10 }
  }, { async: false })

  bench.runSync()

  expect(calls).toBe(10)
})

test('overriddenIterationCost samples stay subject to timer-overhead correction', async () => {
  let counter = 0
  const bench = new Bench({
    iterations: 4,
    retainSamples: true,
    subtractTimerOverhead: true,
    time: 8,
    timestampProvider: {
      fn: () => {
        counter += 1
        return counter * 1000
      },
      fromMs: ms => ms * 1_000_000,
      name: 'det-step-oic',
      toMs: ns => Number(ns) / 1e6,
    },
    warmup: false,
  })

  bench.add('corrected', () => {
    return { overriddenIterationCost: 2 }
  }, { async: false })

  await bench.run()

  const correctedTask = bench.getTask('corrected')
  if (!correctedTask) return expect.unreachable()
  expect(correctedTask.result.state).toBe('completed')
  if (correctedTask.result.state !== 'completed') return
  expect(correctedTask.runs).toBe(4)
  expect(correctedTask.result.latency.samples).toEqual([0, 0, 0, 0])
  expect(correctedTask.detectedResolution).toBeUndefined()
})

test('overriddenIterationCost never enters samples or diagnostics', async () => {
  let calls = 0
  let value = 0
  const cycle: [number, number, number] = [2, 3, 1]
  const bench = new Bench({
    iterations: 12,
    now: () => {
      const delta = cycle[calls++ % 3] ?? 0
      value += delta
      return value
    },
    retainSamples: true,
    throws: true,
    time: 0,
    warmup: false,
  })

  let warnings = 0
  bench.addEventListener('warning', () => {
    warnings += 1
  })

  bench.add('diag', () => {
    return { overriddenIterationCost: 999 }
  }, { async: false })

  await bench.run()

  const diagTask = bench.getTask('diag')
  if (!diagTask) return expect.unreachable()
  expect(diagTask.result.state).toBe('completed')
  if (diagTask.result.state !== 'completed') return
  expect(diagTask.runs).toBe(12)
  const samples = diagTask.result.latency.samples
  if (!samples) return expect.unreachable()
  expect(samples.length).toBe(12)
  expect(samples.filter(s => s === 1).length).toBe(4)
  expect(samples.filter(s => s === 2).length).toBe(4)
  expect(samples.filter(s => s === 3).length).toBe(4)
  expect(diagTask.result.latency.mean).toBe(2)
  expect(diagTask.detectedResolution).toBe(1)
  expect(warnings).toBe(0)
})

test.each(['has', 'get'])('override field lookup tolerates a rejecting %s trap', async trap => {
  const bench = new Bench({
    iterations: 1,
    now: () => 100,
    throws: true,
    time: 6,
    warmup: false,
  })

  const rejectingProxy = new Proxy({ overriddenDuration: 2 }, {
    get (target, key) {
      if (key === 'then') {
        return undefined
      }
      const record = target as Record<string | symbol, unknown>
      if (key in target) {
        return record[key]
      }
      throw new Error(`unknown property: ${String(key)}`)
    },
    has (target, key) {
      if (key === 'overriddenIterationCost' && trap === 'get') {
        return true
      }
      if (key in target) {
        return true
      }
      throw new Error(`unknown property: ${String(key)}`)
    },
  })

  let calls = 0
  bench.add('proxy', () => {
    if (++calls > 100) throw new Error('iteration bound exceeded')
    return rejectingProxy
  }, { async: false })

  await bench.run()

  const proxyTask = bench.getTask('proxy')
  if (!proxyTask) return expect.unreachable()
  expect(proxyTask.result.state).toBe('completed')
  if (proxyTask.result.state !== 'completed') return
  expect(proxyTask.runs).toBe(3)
  expect(proxyTask.result.latency.mean).toBe(2)
})

test.each(['sync', 'async'])('an absent iteration cost keeps the duration budget (%s)', async mode => {
  const bench = new Bench({
    iterations: 1,
    now: () => 100,
    throws: true,
    time: 6,
    warmup: false,
  })
  const result = new Proxy({ overriddenDuration: 2 }, {
    get (target, key) {
      if (key === 'then') return undefined
      if (key === 'overriddenDuration') return target.overriddenDuration
      return 0
    },
  })
  let calls = 0
  const fn = () => {
    if (++calls > 10) throw new Error('iteration bound exceeded')
    return result
  }
  bench.add(
    'proxy',
    mode === 'async'
      ? async () => {
        await Promise.resolve()
        return fn()
      }
      : fn,
    { async: mode === 'async' }
  )

  if (mode === 'async') await bench.run()
  else bench.runSync()

  const task = bench.getTask('proxy')
  if (!task) return expect.unreachable()
  expect(task.result.state).toBe('completed')
  if (task.result.state !== 'completed') return
  expect(task.runs).toBe(3)
  expect(task.result.latency.mean).toBe(2)
})

test.each(['sync', 'async'])('declared zero and negative zero do not advance the sequential budget (%s)', async mode => {
  const bench = new Bench({ iterations: 1, now: () => 100, throws: true, time: 6, warmup: false })
  let calls = 0
  const fn = () => {
    if (++calls > 10) throw new Error('iteration bound exceeded')
    return {
      overriddenDuration: 6,
      overriddenIterationCost: calls === 1 ? 0 : calls === 2 ? -0 : 3,
    }
  }
  bench.add('zero costs', mode === 'async'
    ? async () => {
      await Promise.resolve()
      return fn()
    }
    : fn, { async: mode === 'async' })

  if (mode === 'async') await bench.run()
  else bench.runSync()

  const task = bench.getTask('zero costs')
  if (!task) return expect.unreachable()
  expect(task.result.state).toBe('completed')
  if (task.result.state !== 'completed') return
  expect(task.runs).toBe(4)
  expect(task.result.latency.mean).toBe(6)
})

test.each(['sync', 'async'])('an inherited iteration cost controls the sequential budget (%s)', async mode => {
  const bench = new Bench({ iterations: 1, now: () => 100, throws: true, time: 6, warmup: false })
  const result: unknown = Object.create(
    { overriddenIterationCost: 3 },
    { overriddenDuration: { value: 2 } }
  )
  let calls = 0
  const fn = () => {
    if (++calls > 10) throw new Error('iteration bound exceeded')
    return result
  }
  bench.add('inherited cost', mode === 'async'
    ? async () => {
      await Promise.resolve()
      return fn()
    }
    : fn, { async: mode === 'async' })

  if (mode === 'async') await bench.run()
  else bench.runSync()

  const task = bench.getTask('inherited cost')
  if (!task) return expect.unreachable()
  expect(task.result.state).toBe('completed')
  if (task.result.state !== 'completed') return
  expect(task.runs).toBe(2)
  expect(task.result.latency.mean).toBe(2)
})

test.each(['sync', 'async'])('duration access errors reach the consumer (%s)', async mode => {
  const bench = new Bench({ iterations: 1, now: () => 100, throws: true, time: 0, warmup: false })
  const error = new Error('duration getter failed')
  const result = {
    get overriddenDuration (): number {
      throw error
    },
  }
  bench.add('duration error', mode === 'async'
    ? async () => {
      await Promise.resolve()
      return result
    }
    : () => result, { async: mode === 'async' })

  if (mode === 'async') await expect(bench.run()).rejects.toBe(error)
  else expect(() => bench.runSync()).toThrow(error)
})

test.each([false, true])('task-concurrent run and warmup do not inspect cost (async: %s)', async asyncTask => {
  let clock = 0
  let calls = 0
  let presenceChecks = 0
  let reads = 0
  const result = new Proxy({
    overriddenDuration: 1,
    get overriddenIterationCost () {
      reads++
      clock += 100
      return 0
    },
  }, {
    has (target, key) {
      if (key === 'overriddenIterationCost') {
        presenceChecks++
        clock += 100
      }
      return Reflect.has(target, key)
    },
  })
  const fn = () => {
    if (++calls > 10) throw new Error('iteration bound exceeded')
    clock++
    return result
  }
  const bench = new Bench({
    concurrency: 'task',
    iterations: 5,
    now: () => clock,
    threshold: 1,
    throws: true,
    time: 3,
    warmup: false,
    warmupIterations: 5,
    warmupTime: 3,
  }).add('concurrent', asyncTask
    ? async () => {
      await Promise.resolve()
      return fn()
    }
    : fn, { async: asyncTask })
  const task = bench.getTask('concurrent')
  if (!task) return expect.unreachable()

  await task.warmup()
  expect(calls).toBe(3)
  expect(presenceChecks).toBe(0)
  expect(reads).toBe(0)
  clock = 0
  calls = 0
  await task.run()
  expect(calls).toBe(3)
  expect(task.result.state).toBe('completed')
  expect(task.runs).toBe(3)
  expect(presenceChecks).toBe(0)
  expect(reads).toBe(0)
})

test('warmupSync consumes cost even with task concurrency configured', () => {
  let calls = 0
  const bench = new Bench({
    concurrency: 'task',
    now: () => 0,
    throws: true,
    warmupIterations: 1,
    warmupTime: 10,
  }).add('sync warmup', () => {
    if (++calls > 20) throw new Error('iteration bound exceeded')
    return { overriddenDuration: 1, overriddenIterationCost: 5 }
  }, { async: false })
  const task = bench.getTask('sync warmup')
  if (!task) return expect.unreachable()
  task.warmupSync()
  expect(calls).toBe(2)
})
