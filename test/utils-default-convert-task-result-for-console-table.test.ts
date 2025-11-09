import { expect, test } from 'vitest'

import type { Task } from '../src'

import {
  defaultConvertTaskResultForConsoleTable,
  getStatisticsSorted,
  toSortedSamples
} from '../src/utils'

test('defaultConvertTaskResultForConsoleTable - not-started', () => {
  expect(defaultConvertTaskResultForConsoleTable({
    name: 'Sample Task',
    result: {
      runtime: 'unknown',
      runtimeVersion: 'unknown',
      state: 'not-started',
    }
  } as Task)).toStrictEqual({
    'Latency avg (ns)': 'N/A',
    'Latency med (ns)': 'N/A',
    Remarks: 'not-started',
    Samples: 'N/A',
    'Task name': 'Sample Task',
    'Throughput avg (ops/s)': 'N/A',
    'Throughput med (ops/s)': 'N/A',
  })

  expect(Object.keys(defaultConvertTaskResultForConsoleTable({
    name: 'Sample Task',
    result: {
      runtime: 'unknown',
      runtimeVersion: 'unknown',
      state: 'not-started',
    }
  } as Task))).toStrictEqual([
    'Task name',
    'Latency avg (ns)',
    'Latency med (ns)',
    'Throughput avg (ops/s)',
    'Throughput med (ops/s)',
    'Samples',
    'Remarks',
  ])
})

test('defaultConvertTaskResultForConsoleTable - started', () => {
  expect(defaultConvertTaskResultForConsoleTable({
    name: 'Sample Task',
    result: {
      runtime: 'unknown',
      runtimeVersion: 'unknown',
      state: 'started',
    }
  } as Task)).toStrictEqual({
    'Latency avg (ns)': 'N/A',
    'Latency med (ns)': 'N/A',
    Remarks: 'started',
    Samples: 'N/A',
    'Task name': 'Sample Task',
    'Throughput avg (ops/s)': 'N/A',
    'Throughput med (ops/s)': 'N/A',
  })

  expect(Object.keys(defaultConvertTaskResultForConsoleTable({
    name: 'Sample Task',
    result: {
      runtime: 'unknown',
      runtimeVersion: 'unknown',
      state: 'started',
    }
  } as Task))).toStrictEqual([
    'Task name',
    'Latency avg (ns)',
    'Latency med (ns)',
    'Throughput avg (ops/s)',
    'Throughput med (ops/s)',
    'Samples',
    'Remarks',
  ])
})

test('defaultConvertTaskResultForConsoleTable - aborted', () => {
  expect(defaultConvertTaskResultForConsoleTable({
    name: 'Sample Task',
    result: {
      runtime: 'unknown',
      runtimeVersion: 'unknown',
      state: 'aborted',
    }
  } as Task)).toStrictEqual({
    'Latency avg (ns)': 'N/A',
    'Latency med (ns)': 'N/A',
    Remarks: 'aborted',
    Samples: 'N/A',
    'Task name': 'Sample Task',
    'Throughput avg (ops/s)': 'N/A',
    'Throughput med (ops/s)': 'N/A',
  })

  expect(Object.keys(defaultConvertTaskResultForConsoleTable({
    name: 'Sample Task',
    result: {
      runtime: 'unknown',
      runtimeVersion: 'unknown',
      state: 'aborted',
    }
  } as Task))).toStrictEqual([
    'Task name',
    'Latency avg (ns)',
    'Latency med (ns)',
    'Throughput avg (ops/s)',
    'Throughput med (ops/s)',
    'Samples',
    'Remarks',
  ])
})

test('defaultConvertTaskResultForConsoleTable - errored - with stack', () => {
  const error = new Error('Sample error')
  error.stack = 'Sample stack trace'
  expect(defaultConvertTaskResultForConsoleTable({
    name: 'Sample Task',
    result: {
      error,
      runtime: 'unknown',
      runtimeVersion: 'unknown',
      state: 'errored',
    }
  } as Task)).toStrictEqual({
    Error: error.message,
    Stack: error.stack,
    'Task name': 'Sample Task'
  })

  expect(Object.keys(defaultConvertTaskResultForConsoleTable({
    name: 'Sample Task',
    result: {
      error,
      runtime: 'unknown',
      runtimeVersion: 'unknown',
      state: 'errored',
    }
  } as Task))).toStrictEqual([
    'Task name',
    'Error',
    'Stack',
  ])
})

test('defaultConvertTaskResultForConsoleTable - errored - without stack', () => {
  const error = new Error('Sample error')
  error.stack = undefined
  expect(defaultConvertTaskResultForConsoleTable({
    name: 'Sample Task',
    result: {
      error,
      runtime: 'unknown',
      runtimeVersion: 'unknown',
      state: 'errored',
    }
  } as Task)).toStrictEqual({
    Error: error.message,
    Stack: 'N/A',
    'Task name': 'Sample Task'
  })

  expect(Object.keys(defaultConvertTaskResultForConsoleTable({
    name: 'Sample Task',
    result: {
      error,
      runtime: 'unknown',
      runtimeVersion: 'unknown',
      state: 'errored',
    }
  } as Task))).toStrictEqual([
    'Task name',
    'Error',
    'Stack',
  ])
})

test('defaultConvertTaskResultForConsoleTable - aborted-with-statistics', () => {
  const samples = toSortedSamples([900, 950, 1000, 1050, 1100])
  const statistics = getStatisticsSorted(samples)
  expect(defaultConvertTaskResultForConsoleTable({
    name: 'Sample Task',
    result: {
      latency: statistics,
      runtime: 'unknown',
      runtimeVersion: 'unknown',
      state: 'aborted-with-statistics',
      throughput: statistics,
      ...statistics
    }
  } as unknown as Task)).toStrictEqual({
    'Latency avg (ns)': '1000000000 ± 9.82%',
    'Latency med (ns)': '1000000000 ± 50000000',
    Remarks: 'aborted-with-statistics',
    Samples: 5,
    'Task name': 'Sample Task',
    'Throughput avg (ops/s)': '1000 ± 9.82%',
    'Throughput med (ops/s)': '1000 ± 50',
  })

  expect(Object.keys(defaultConvertTaskResultForConsoleTable({
    name: 'Sample Task',
    result: {
      latency: statistics,
      runtime: 'unknown',
      runtimeVersion: 'unknown',
      state: 'aborted-with-statistics',
      throughput: statistics,
      ...statistics
    }
  } as unknown as Task))).toStrictEqual([
    'Task name',
    'Latency avg (ns)',
    'Latency med (ns)',
    'Throughput avg (ops/s)',
    'Throughput med (ops/s)',
    'Samples',
    'Remarks',
  ])
})

test('defaultConvertTaskResultForConsoleTable - completed', () => {
  const samples = toSortedSamples([900, 950, 1000, 1050, 1100])
  const statistics = getStatisticsSorted(samples)
  expect(defaultConvertTaskResultForConsoleTable({
    name: 'Sample Task',
    result: {
      latency: statistics,
      runtime: 'unknown',
      runtimeVersion: 'unknown',
      state: 'completed',
      throughput: statistics,
      ...statistics
    }
  } as unknown as Task)).toStrictEqual({
    'Latency avg (ns)': '1000000000 ± 9.82%',
    'Latency med (ns)': '1000000000 ± 50000000',
    Samples: 5,
    'Task name': 'Sample Task',
    'Throughput avg (ops/s)': '1000 ± 9.82%',
    'Throughput med (ops/s)': '1000 ± 50',
  })

  expect(Object.keys(defaultConvertTaskResultForConsoleTable({
    name: 'Sample Task',
    result: {
      latency: statistics,
      runtime: 'unknown',
      runtimeVersion: 'unknown',
      state: 'completed',
      throughput: statistics,
      ...statistics
    }
  } as unknown as Task))).toStrictEqual([
    'Task name',
    'Latency avg (ns)',
    'Latency med (ns)',
    'Throughput avg (ops/s)',
    'Throughput med (ops/s)',
    'Samples',
  ])
})
