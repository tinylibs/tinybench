import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.pretest.ts'],
    testTimeout: 10000,
  },
})
