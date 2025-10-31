import { expect, test } from 'vitest'

import { Bench } from '../src'

test(
  'detect faster task (async)',
  async () => {
    const bench = new Bench({ iterations: 32, time: 100 })
    bench
      .add('faster', async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      .add('slower', async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

    await bench.run()

    const fasterTask = bench.getTask('faster')
    const slowerTask = bench.getTask('slower')

    expect(fasterTask).toBeDefined()
    if (!fasterTask) return

    expect(slowerTask).toBeDefined()
    if (!slowerTask) return

    expect(fasterTask.result.state).toBe('completed')
    if (fasterTask.result.state !== 'completed') return

    expect(slowerTask.result.state).toBe('completed')
    if (slowerTask.result.state !== 'completed') return

    expect(fasterTask.result.latency.mean).toBeLessThan(
      slowerTask.result.latency.mean
    )
    expect(fasterTask.result.latency.min).toBeLessThan(
      slowerTask.result.latency.min
    )
    expect(fasterTask.result.latency.max).toBeLessThan(
      slowerTask.result.latency.max
    )
    // latency moe should be lesser since it's faster
    // expect(fasterTask.result.latency.moe).toBeLessThan(
    //   slowerTask.result.latency.moe
    // )

    expect(fasterTask.result.throughput.mean).toBeGreaterThan(
      slowerTask.result.throughput.mean
    )
    expect(fasterTask.result.throughput.min).toBeGreaterThan(
      slowerTask.result.throughput.min
    )
    expect(fasterTask.result.throughput.max).toBeGreaterThan(
      slowerTask.result.throughput.max
    )
    // throughput moe should be greater since it's faster
    // expect(fasterTask.result.throughput.moe).toBeGreaterThan(
    //   slowerTask.result.throughput.moe
    // )
  }
)
