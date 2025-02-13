import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: (import.meta as unknown as {dirname: string}).dirname,
      },
    },
  },
  {
    name: 'ignored-files',
    ignores: ['node_modules/', 'dist/', '**/*.test.ts'],
  },
  {
    name: 'allow tests with default service',
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['vitest.config.ts', 'tsup.config.ts', 'eslint.config.mts'],
        },
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      /**
       * See
       * https://www.totaltypescript.com/type-vs-interface-which-should-you-use
       */
      '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],
    },
  },
)
