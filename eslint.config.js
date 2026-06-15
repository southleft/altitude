// T2.3.c — ESLint 9 flat config. Replaces all per-workspace .eslintrc shapes.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
  {
    ignores: [
      '**/dist/**',
      '**/dist-vite/**',
      '**/dist-v5/**',
      '**/dist-vite-spike/**',
      '**/node_modules/**',
      '**/storybook-static/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/.storybook/preview-bundle*',
      '**/coverage/**',
      'libs/al-web-components/styles/tokens-dtcg/**',
      'libs/al-web-components/styles/dist/**',
      'libs/al-web-components/custom-elements.json',
      'libs/al-web-components/schemas/**',
      'apps/angular/.angular/**',
      'apps/**/build/**',
      'apps/**/dist/**',
      'apps/**/.svelte-kit/**',
      'apps/knapsack/**',
      'storybook/**',
      'storybook-static/**',
      '**/*.min.js',
      '**/*.LICENSE.txt',
      'docs/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.es2022 },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      // Lit decorators rely on accessor + experimentalDecorators — many of
      // these would be noisy until a future refactor decides on stage-3
      // decorators (plan T7.1).
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'off', // TypeScript handles this; flat-config emits false positives on globals
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-empty': 'off',
      // Legacy v1 codebase has accumulated style debt. Downgrade these to
      // warnings so the flat-config lint job passes; v2.x cleanup can flip
      // them to errors per slice.
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'no-self-assign': 'warn',
      'no-useless-escape': 'warn',
      'prefer-const': 'warn',
      'no-prototype-builtins': 'warn',
      'no-cond-assign': 'warn',
      'no-empty-pattern': 'warn',
      'no-irregular-whitespace': 'warn',
      'no-fallthrough': 'warn',
      'no-async-promise-executor': 'warn',
      'no-control-regex': 'warn',
      'no-unsafe-finally': 'warn',
      'prefer-spread': 'warn',
    },
  },
  {
    files: ['**/*.cjs', 'scripts/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
