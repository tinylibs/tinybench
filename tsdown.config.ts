import { defineConfig } from 'tsdown/config'

export default defineConfig({
  entry: ['src/index.ts'],
  minify: {
    // eslint-disable-next-line @cspell/spellchecker
    codegen: {
      removeWhitespace: false,
    },
    compress: true,
    mangle: true,
  },
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
