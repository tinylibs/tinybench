import cspellConfigs from '@cspell/eslint-plugin/configs'
import js from '@eslint/js'
import jsdoc from 'eslint-plugin-jsdoc'
import perfectionist from 'eslint-plugin-perfectionist'
import neostandard, { plugins } from 'neostandard'

export default [
  {
    ignores: ['docs/**', 'package/**'],
  },
  cspellConfigs.recommended,
  {
    rules: {
      '@cspell/spellchecker': [
        'warn',
        {
          autoFix: true,
          cspell: {
            words: [
              'evanwashere',
              'fastly',
              'lagon',
              'lockdown',
              'quickjs',
              'moddable',
              'neostandard',
              'spidermonkey',
              'workerd',
            ],
          },
        },
      ],
    },
  },
  js.configs.recommended,
  jsdoc.configs['flat/recommended-typescript'],
  ...plugins['typescript-eslint'].config(
    {
      extends: [
        ...plugins['typescript-eslint'].configs.strictTypeChecked,
        ...plugins['typescript-eslint'].configs.stylisticTypeChecked,
      ],
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir: import.meta.dirname,
        },
      },
    },
    {
      files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
      ...plugins['typescript-eslint'].configs.disableTypeChecked,
    }
  ),
  perfectionist.configs['recommended-natural'],
  ...neostandard({
    noJsx: true,
    ts: true,
  }),
]
