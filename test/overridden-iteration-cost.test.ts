import { expect, test } from 'vitest'

import { Bench } from '../src'

/**
 * Most tests use a constant clock (`now: () => 100`) where the tinybench-measured
 * wall duration of every iteration is exactly `0` ms: any regression that
 * accumulates the measured wall instead of the declared cost into the `time`
 * budget never terminates and fails via the test timeout. The timer-overhead
 * correction and diagnostics tests use step or cycling clocks instead and pin
 * their behavior through exact assertions.
 */

test('overriddenDuration alone drives the time budget (async)', async () => {
  const bench = new Bench({
    iterations: 1,
    now: () => 100,
    throws: true,
    time: 100,
    warmup: false,
  })

  bench.add('foo', () => {
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

  bench.add('foo', () => {
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

  bench.add('batch', () => {
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

  bench.add('batch', () => {
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

  bench.add('oic', () => {
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

  bench.add('oic', () => {
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

    bench.add('foo', () => {
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

    bench.add('foo', () => {
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

test('overriddenIterationCost is a no-op with task concurrency', async () => {
  const bench = new Bench({
    concurrency: 'task',
    iterations: 7,
    now: () => 100,
    throws: true,
    time: 0,
    warmup: false,
  })

  bench.add('concurrent', () => {
    return { overriddenIterationCost: 1000 }
  })

  await bench.run()

  const concurrentTask = bench.getTask('concurrent')
  if (!concurrentTask) return expect.unreachable()
  expect(concurrentTask.result.state).toBe('completed')
  if (concurrentTask.result.state !== 'completed') return
  expect(concurrentTask.runs).toBe(7)
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
  bench.add('warm', () => {
    calls += 1
    return { overriddenIterationCost: 10 }
  }, { async: false })

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
    calls += 1
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

test('override field lookup tolerates rejecting proxies', async () => {
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
      if (key in target) {
        return true
      }
      throw new Error(`unknown property: ${String(key)}`)
    },
  })

  bench.add('proxy', () => {
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
