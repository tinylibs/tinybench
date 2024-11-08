import { defineConfig } from 'tsup'

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  minify: false,
  minifyIdentifiers: true,
  minifySyntax: true,
  minifyWhitespace: false,
  outDir: 'dist',
})
