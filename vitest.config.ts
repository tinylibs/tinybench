import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      include: ['src/**/*.ts'],
      provider: 'v8',
    },
    testTimeout: 10000,
  },
})
