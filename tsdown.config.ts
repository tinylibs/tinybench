import { defineConfig } from 'tsdown/config'

export default defineConfig({
  entry: ['src/index.ts'],
  outExtensions: () =>{
    return {
      js: '.js',
      dts: '.d.ts',
    }
  },
  minify: {
    compress: true,
    mangle: true,
  },
})
