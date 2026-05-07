import { defineConfig } from 'tsdown/config'

export default defineConfig({
  entry: ['src/index.ts'],
  outExtensions: () => {
    return {
      dts: '.d.ts',
      js: '.js',
    }
  },
  outputOptions: {
    comments: false,
  },
})
