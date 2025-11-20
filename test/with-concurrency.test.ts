import { expect, test } from 'vitest'

import { hrtimeNow, withConcurrency } from '../src/utils'
import { asyncSleep } from './utils'

test('runs all iterations with limited concurrency', async () => {
  let runs = 0
  const fn = async () => {
    runs++
    await asyncSleep(10)
    return runs
  }

  const result = await withConcurrency({
    fn,
    iterations: 20,
    limit: 5,
  })

  expect(result.length).toBe(20)
  expect(runs).toBe(20)
})

test('respects concurrency limit (no oversubscription)', async () => {
  let active = 0
  let peak = 0

  const fn = async () => {
    active++
    peak = Math.max(peak, active)
    await asyncSleep(10)
    active--
  }

  await withConcurrency({
    fn,
    iterations: 50,
    limit: 4,
  })

  expect(peak).toBeLessThanOrEqual(4)
})

test('stops after time limit even with unlimited iterations', async () => {
  const start = hrtimeNow()
  let calls = 0
  await withConcurrency({
    fn: async () => {
      calls++
      await asyncSleep(5)
    },
    iterations: 0,
    limit: 10,
    time: 50,
  })
  const elapsed = hrtimeNow() - start
  expect(elapsed).toBeGreaterThanOrEqual(50)
  expect(calls).toBeGreaterThan(0)
})

test('aborts cleanly when signal is triggered', async () => {
  const controller = new AbortController()
  let calls = 0

  const fn = async () => {
    calls++
    await asyncSleep(20)
  }

  const promise = withConcurrency({
    fn,
    iterations: 100,
    limit: 5,
    signal: controller.signal,
  })

  setTimeout(() => {
    controller.abort()
  }, 30)

  const result = await promise
  expect(Array.isArray(result)).toBe(true)

  expect(calls).toBeGreaterThan(0)
})

test('throws on error and stops other workers', async () => {
  let calls = 0
  const fn = async () => {
    calls++
    if (calls === 5) throw new Error('Boom')
    await asyncSleep(5)
  }

  await expect(
    withConcurrency({
      fn,
      iterations: 100,
      limit: 10,
    })
  ).rejects.toThrowError(/Boom/)

  expect(calls).toBeGreaterThanOrEqual(5)
  expect(calls).toBeLessThan(100)
})

test('runs exact number of iterations', async () => {
  let runs = 0
  await withConcurrency({
    fn: async () => {
      runs++
      await asyncSleep(2)
    },
    iterations: 30,
    limit: 10,
  })
  expect(runs).toBe(30)
})

test('limit equals iterations', async () => {
  let active = 0
  let peak = 0
  await withConcurrency({
    fn: async () => {
      active++
      peak = Math.max(peak, active)
      await asyncSleep(5)
      active--
    },
    iterations: 8,
    limit: 8,
  })
  expect(peak).toBeLessThanOrEqual(8)
})

test('limit greater than iterations', async () => {
  let runs = 0
  await withConcurrency({
    fn: async () => {
      runs++
      await asyncSleep(3)
    },
    iterations: 5,
    limit: 10,
  })
  expect(runs).toBe(5)
})

test('limit equals zero', async () => {
  const result = await withConcurrency({
    fn: async () => 1, // eslint-disable-line @typescript-eslint/require-await
    iterations: 0,
    limit: 0,
    time: 10,
  })
  expect(Array.isArray(result)).toBe(true)
})

test('time limit stops unlimited iterations', async () => {
  let runs = 0
  const start = hrtimeNow()
  await withConcurrency({
    fn: async () => {
      runs++
      await asyncSleep(3)
    },
    iterations: 0,
    limit: 5,
    time: 50,
  })
  const elapsed = hrtimeNow() - start
  expect(elapsed).toBeGreaterThanOrEqual(50)
  expect(runs).toBeGreaterThan(0)
})

test('abort signal before start returns immediately', async () => {
  const controller = new AbortController()
  controller.abort()
  const result = await withConcurrency({
    fn: async () => 1, // eslint-disable-line @typescript-eslint/require-await
    iterations: 100,
    limit: 10,
    signal: controller.signal,
  })
  expect(result).toEqual([])
})

test('abort during execution stops new tasks', async () => {
  const controller = new AbortController()
  let calls = 0
  const fn = async () => {
    calls++
    await asyncSleep(15)
  }
  const promise = withConcurrency({
    fn,
    iterations: 1000,
    limit: 10,
    signal: controller.signal,
  })
  setTimeout(() => {
    controller.abort()
  }, 25)
  const result = await promise
  expect(Array.isArray(result)).toBe(true)
  expect(calls).toBeGreaterThan(0)
  expect(calls).toBeLessThan(1000)
})

test('throws AggregateError when multiple errors occur', async () => {
  let count = 0
  const fn = async () => {
    count++
    if (count % 2 === 0) throw new Error('even')
    await asyncSleep(2)
  }
  await expect(
    withConcurrency({
      fn,
      iterations: 10,
      limit: 5,
    })
  ).rejects.toThrow(AggregateError)
})

test('throws single error correctly', async () => {
  let count = 0
  // eslint-disable-next-line @typescript-eslint/require-await
  const fn = async () => {
    count++
    if (count === 3) throw new Error('boom')
  }
  await expect(
    withConcurrency({
      fn,
      iterations: 5,
      limit: 2,
    })
  ).rejects.toThrow('boom')
})

test('result values are collected correctly', async () => {
  const fn = async () => {
    await asyncSleep(Math.random() * 5)
    return 42
  }
  const results = await withConcurrency({
    fn,
    iterations: 10,
    limit: 3,
  })
  expect(results.every(v => v === 42)).toBe(true)
})

test('works with synchronous function returning immediately', async () => {
  const fn = () => 99
  const results = await withConcurrency({
    // @ts-expect-error testing sync function
    fn,
    iterations: 7,
    limit: 3,
  })
  expect(results.length).toBe(7)
  expect(results[0]).toBe(99)
})

test('stress test: random delays and concurrency', async () => {
  for (let i = 0; i < 50; i++) {
    let runs = 0
    await withConcurrency({
      fn: async () => {
        runs++
        await asyncSleep(Math.random() * 5)
      },
      iterations: 20,
      limit: 5,
    })
    expect(runs).toBe(20)
  }
})

test('high concurrency stability', async () => {
  let runs = 0
  await withConcurrency({
    fn: async () => {
      runs++
      await asyncSleep(1)
    },
    iterations: 200,
    limit: 50,
  })
  expect(runs).toBe(200)
})

test('handles long-running tasks correctly', async () => {
  const start = hrtimeNow()
  await withConcurrency({
    fn: async () => {
      await asyncSleep(50)
    },
    iterations: 5,
    limit: 2,
  })
  const elapsed = hrtimeNow() - start
  expect(elapsed).toBeGreaterThanOrEqual(100)
})

test('time limit overrides remaining iterations', async () => {
  let count = 0
  await withConcurrency({
    fn: async () => {
      count++
      await asyncSleep(10)
    },
    iterations: 100,
    limit: 10,
    time: 40,
  })
  expect(count).toBeLessThan(100)
})
