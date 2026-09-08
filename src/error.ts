// Portions copyright evanwashere. 2024. All Rights Reserved.
// Portions copyright QuiiBz. 2023-2024. All Rights Reserved.

/**
 * Throws an error if the condition is false.
 * @param condition - the condition to check
 * @param message - the error message to throw if the condition is false
 * @throws {Error} if the condition is false
 */
export const assert = (condition: boolean, message: string): void => {
  if (!condition) {
    const stackTraceLimit = Error.stackTraceLimit
    try {
      Error.stackTraceLimit = 0
      const error = new Error(message)
      Error.stackTraceLimit = stackTraceLimit
      stackTraceLimit !== 0 && Error.captureStackTrace(error, assert)
      throw error
    } finally {
      Error.stackTraceLimit = stackTraceLimit
    }
  }
}

/**
 * Thrown errors can be of any type. This function converts any value to an Error object.
 * @param value - value to convert to Error
 * @returns the converted Error
 */
export const toError = (value: unknown): Error => {
  switch (typeof value) {
    case 'function':
      return new Error(value.name)
    case 'object':
      if (value !== null) {
        return value instanceof Error
          ? value
          : new Error((value as { message?: string }).message ?? '')
      }
    // eslint-disable-next-line no-fallthrough
    case 'undefined':
      return new Error()
    case 'string':
      return new Error(value)
    default:
      return new Error(String(value))
  }
}
