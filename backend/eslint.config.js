import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.ts'],
  })),
  {
    files: ['**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportDeclaration[source.value=/^\\.{1,2}\\/.*\\.js$/]',
          message: 'Use .ts extensions in relative TypeScript imports.',
        },
        {
          selector: 'ExportNamedDeclaration[source.value=/^\\.{1,2}\\/.*\\.js$/]',
          message: 'Use .ts extensions in relative TypeScript imports.',
        },
        {
          selector: 'ExportAllDeclaration[source.value=/^\\.{1,2}\\/.*\\.js$/]',
          message: 'Use .ts extensions in relative TypeScript imports.',
        },
        {
          selector: 'ImportExpression[source.value=/^\\.{1,2}\\/.*\\.js$/]',
          message: 'Use .ts extensions in relative TypeScript imports.',
        },
      ],
    },
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            'tests/features/health/api/*.test.ts',
            'tests/features/trades/api/*.test.ts',
            'tests/features/trades/repositories/*.test.ts',
            'tests/features/trades/services/*.test.ts',
            'tests/openapi/*.test.ts',
          ],
        },
      },
    },
  },
);
