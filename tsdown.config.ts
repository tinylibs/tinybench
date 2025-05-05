import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  minify: {
    compress: true,
    mangle: true,
  },
})
