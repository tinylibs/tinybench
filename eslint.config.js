import js from '@eslint/js'
import perfectionist from 'eslint-plugin-perfectionist'
import neostandard, { plugins } from 'neostandard'

export default [
  js.configs.recommended,
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
    ts: true,
  }),
]
