import type { Task } from './task'
import type { ConsoleTableConverter } from './types'

import { mToNs } from './conversions'
import { formatNumber } from './format'

export const defaultConvertTaskResultForConsoleTable: ConsoleTableConverter = (
  task: Task
): Record<string, number | string> => {
  const state = task.result.state
  /* eslint-disable perfectionist/sort-objects */
  return {
    'Task name': task.name,
    ...(state === 'aborted-with-statistics' || state === 'completed'
      ? {
          'Latency avg (ns)': `${formatNumber(mToNs(task.result.latency.mean))} \xb1 ${formatNumber(task.result.latency.rme)}%`,
          'Latency med (ns)': `${formatNumber(mToNs(task.result.latency.p50))} \xb1 ${formatNumber(mToNs(task.result.latency.mad))}`,
          'Throughput avg (ops/s)': `${Math.round(task.result.throughput.mean).toString()} \xb1 ${formatNumber(task.result.throughput.rme)}%`,
          'Throughput med (ops/s)': `${Math.round(task.result.throughput.p50).toString()} \xb1 ${Math.round(task.result.throughput.mad).toString()}`,
          Samples: task.result.latency.samplesCount,
        }
      : state !== 'errored'
        ? {
            'Latency avg (ns)': 'N/A',
            'Latency med (ns)': 'N/A',
            'Throughput avg (ops/s)': 'N/A',
            'Throughput med (ops/s)': 'N/A',
            Samples: 'N/A',
            Remarks: state,
          }
        : {
            Error: task.result.error.message,
            Stack: task.result.error.stack ?? 'N/A',
          }),
    ...(state === 'aborted-with-statistics' && {
      Remarks: state,
    }),
  }
  /* eslint-enable perfectionist/sort-objects */
}
