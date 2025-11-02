import { beforeEach, describe, expect, test } from 'vitest'

import type { PLimitInstance } from '../src/types'

import { pLimit } from '../src/utils'
import { asyncSleep } from './utils'

describe('pLimit', () => {
  let limiter: PLimitInstance

  beforeEach(() => {
    limiter = pLimit(2)
  })

  test('creates a limiter with correct initial state', () => {
    expect(typeof limiter).toBe('function')
    expect(limiter.activeCount).toBe(0)
    expect(limiter.pendingCount).toBe(0)
  })

  test('executes single task successfully', async () => {
    const result = await limiter(async () => {
      await asyncSleep(10)
      return 'hello'
    })

    expect(result).toBe('hello')
    expect(limiter.activeCount).toBe(0)
    expect(limiter.pendingCount).toBe(0)
  })

  test('basic concurrency limiting', async () => {
    const results: number[] = []
    const activeTracker: number[] = []

    const createTask = (id: number, delay: number) =>
      limiter(async () => {
        activeTracker.push(limiter.activeCount)
        expect(limiter.activeCount).toBeLessThanOrEqual(2)

        await asyncSleep(delay)
        results.push(id)
        return id
      })

    const promises = [
      createTask(1, 100),
      createTask(2, 50),
      createTask(3, 75),
      createTask(4, 25),
    ]

    await Promise.all(promises)

    expect(results.sort()).toEqual([1, 2, 3, 4])
    expect(Math.max(...activeTracker)).toBe(2)
  })

  test('activeCount and pendingCount tracking', async () => {
    expect(limiter.activeCount).toBe(0)
    expect(limiter.pendingCount).toBe(0)

    const promise1 = limiter(async () => {
      expect(limiter.activeCount).toBe(1)
      expect(limiter.pendingCount).toBe(0)
      await asyncSleep(100)
      return 'task1'
    })

    const promise2 = limiter(async () => {
      expect(limiter.activeCount).toBe(2)
      expect(limiter.pendingCount).toBe(0)
      await asyncSleep(50)
      return 'task2'
    })

    const promise3 = limiter(async () => {
      expect(limiter.activeCount).toBeLessThanOrEqual(2)
      await asyncSleep(25)
      return 'task3'
    })

    await asyncSleep(10)
    expect(limiter.activeCount).toBe(2)
    expect(limiter.pendingCount).toBe(1)

    await Promise.all([promise1, promise2, promise3])
    expect(limiter.activeCount).toBe(0)
    expect(limiter.pendingCount).toBe(0)
  })

  test('processes tasks in FIFO order', async () => {
    const limiter1 = pLimit(1) // Single concurrency for strict ordering
    const results: number[] = []

    const createTask = (id: number) =>
      limiter1(async () => {
        await asyncSleep(10)
        results.push(id)
        return id
      })

    const promises = [
      createTask(1),
      createTask(2),
      createTask(3),
      createTask(4),
    ]

    await Promise.all(promises)

    expect(results).toEqual([1, 2, 3, 4])
  })

  test('handles task errors properly', async () => {
    const successfulResult = await limiter(async () => {
      await asyncSleep(10)
      return 'success'
    })

    expect(successfulResult).toBe('success')

    await expect(
      limiter(async () => {
        await asyncSleep(10)
        throw new Error('Test error')
      })
    ).rejects.toThrow('Test error')

    const afterErrorResult = await limiter(async () => {
      await asyncSleep(10)
      return 'after-error'
    })

    expect(afterErrorResult).toBe('after-error')
    expect(limiter.activeCount).toBe(0)
    expect(limiter.pendingCount).toBe(0)
  })

  test('handles multiple concurrent errors', async () => {
    const promises = [
      limiter(async () => {
        await asyncSleep(50)
        throw new Error('Error 1')
      }),
      limiter(async () => {
        await asyncSleep(25)
        throw new Error('Error 2')
      }),
      limiter(async () => {
        await asyncSleep(10)
        return 'success'
      }),
    ]

    const results = await Promise.allSettled(promises)

    expect(results[0]?.status).toBe('rejected')
    expect(results[1]?.status).toBe('rejected')
    expect(results[2]?.status).toBe('fulfilled')
    if (results[2]?.status === 'fulfilled') {
      expect(results[2].value).toBe('success')
    }
    expect(limiter.activeCount).toBe(0)
    expect(limiter.pendingCount).toBe(0)
  })

  test('edge case: limit = 1 (complete serialization)', async () => {
    const serialLimiter = pLimit(1)
    const executionOrder: number[] = []
    const startTimes: number[] = []

    const createTask = (id: number) =>
      serialLimiter(async () => {
        const start = Date.now()
        startTimes.push(start)
        executionOrder.push(id)

        expect(serialLimiter.activeCount).toBe(1)

        await asyncSleep(50)
        return id
      })

    const promises = [createTask(1), createTask(2), createTask(3)]

    await Promise.all(promises)

    expect(executionOrder).toEqual([1, 2, 3])
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(startTimes[1]! - startTimes[0]!).toBeGreaterThanOrEqual(40)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(startTimes[2]! - startTimes[1]!).toBeGreaterThanOrEqual(40)
  })

  test('edge case: limit = 0 should handle gracefully', () => {
    expect(() => pLimit(0)).not.toThrow()
    const zeroLimiter = pLimit(0)

    expect(zeroLimiter.activeCount).toBe(0)
    expect(zeroLimiter.pendingCount).toBe(0)
  })

  test('high concurrency limit', async () => {
    const highLimiter = pLimit(100)
    const taskCount = 50
    const results: number[] = []

    const promises = Array.from({ length: taskCount }, (_, i) =>
      highLimiter(async () => {
        await asyncSleep(Math.random() * 10)
        results.push(i)
        return i
      })
    )

    await Promise.all(promises)

    expect(results).toHaveLength(taskCount)
    expect(results.sort((a, b) => a - b)).toEqual(
      Array.from({ length: taskCount }, (_, i) => i)
    )
    expect(highLimiter.activeCount).toBe(0)
    expect(highLimiter.pendingCount).toBe(0)
  })

  test('stress test: many concurrent tasks', async () => {
    const stressLimiter = pLimit(3)
    const taskCount = 100
    const results: number[] = []
    let maxActiveCount = 0

    const promises = Array.from({ length: taskCount }, (_, i) =>
      stressLimiter(async () => {
        maxActiveCount = Math.max(maxActiveCount, stressLimiter.activeCount)
        expect(stressLimiter.activeCount).toBeLessThanOrEqual(3)

        await asyncSleep(Math.random() * 5)
        results.push(i)
        return i
      })
    )

    await Promise.all(promises)

    expect(results).toHaveLength(taskCount)
    expect(maxActiveCount).toBe(3)
    expect(stressLimiter.activeCount).toBe(0)
    expect(stressLimiter.pendingCount).toBe(0)
  })

  test('task returns different types', async () => {
    // eslint-disable-next-line @typescript-eslint/require-await
    const stringResult = await limiter(async () => 'hello')
    expect(stringResult).toBe('hello')

    // eslint-disable-next-line @typescript-eslint/require-await
    const numberResult = await limiter(async () => 42)
    expect(numberResult).toBe(42)

    // eslint-disable-next-line @typescript-eslint/require-await
    const objectResult = await limiter(async () => ({ id: 1, name: 'test' }))
    expect(objectResult).toEqual({ id: 1, name: 'test' })
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    const undefinedResult = await limiter(async () => {
      await asyncSleep(10)
      return undefined
    })
    expect(undefinedResult).toBeUndefined()
  })

  test('limiter properties are readonly', () => {
    const initialActive = limiter.activeCount
    const initialPending = limiter.pendingCount

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      ;(limiter as any).activeCount = 999
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      ;(limiter as any).pendingCount = 999
    } catch {
      // Expected in strict mode
    }

    // Values should remain unchanged
    expect(limiter.activeCount).toBe(initialActive)
    expect(limiter.pendingCount).toBe(initialPending)
  })

  test('nested limiter calls', async () => {
    const outerLimiter = pLimit(2)
    const innerLimiter = pLimit(1)
    const results: string[] = []

    const promises = [1, 2, 3].map(i =>
      outerLimiter(async () => {
        return innerLimiter(async () => {
          await asyncSleep(20)
          results.push(`task-${i.toString()}`)
          return `task-${i.toString()}`
        })
      })
    )

    await Promise.all(promises)

    expect(results).toHaveLength(3)
    expect(results.sort()).toEqual(['task-1', 'task-2', 'task-3'])
  })

  test('immediate task completion (no async delay)', async () => {
    const results: number[] = []

    const promises = [1, 2, 3, 4].map(i =>
      // eslint-disable-next-line @typescript-eslint/require-await
      limiter(async () => {
        results.push(i)
        return i
      })
    )

    await Promise.all(promises)

    expect(results).toHaveLength(4)
    expect(results.sort()).toEqual([1, 2, 3, 4])
    expect(limiter.activeCount).toBe(0)
    expect(limiter.pendingCount).toBe(0)
  })
})
