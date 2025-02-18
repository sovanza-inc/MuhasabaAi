import { FlatCompat } from '@eslint/eslintrc'
import eslint from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
})

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  eslintConfigPrettier,
  ...compat.config({
    extends: ['eslint-config-next'],
    settings: {
      next: {
        rootDir: 'apps/web/',
      },
    },
  }),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-empty-interface': [
        'warn',
        {
          allowSingleExtends: true,
        },
      ],
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'next/router',
              message: 'Please import from next/navigation instead.',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      'apps/*/.next/',
      'apps/*/next.config.*',
      '**/generated/',
      '**/*.generated.*',
      '**/dist/',
      '.prettierrc.cjs',
      'lint-staged.config.cjs',
      'eslint.config.js',
      '**/.storybook/',
    ],
  },
)
