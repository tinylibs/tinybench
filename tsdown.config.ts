import { defineConfig } from 'tsdown/config'

export default defineConfig({
  entry: ['src/index.ts'],
  minify: {
    compress: true,
    mangle: true,
  },
})
